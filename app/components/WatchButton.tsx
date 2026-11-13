"use client";

import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/nextjs";

/**
 * Follow or unfollow a coin.
 *
 * The button holds its own optimistic state so a star responds on click
 * rather than after a round trip, and rolls back if the server disagrees.
 */
export default function WatchButton({
  coinId,
  initialWatching,
  label = true,
}: {
  coinId: string;
  /** Omit only where the parent cannot know: the component then asks for
   *  itself. In a list, pass it down — one fetch per row is not a list. */
  initialWatching?: boolean;
  /** False renders the star alone, for use inside a dense table row. */
  label?: boolean;
}) {
  const [watching, setWatching] = useState(initialWatching ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signed-out visitors would only get a 401 back, so they are not asked.
  const { isSignedIn } = useAuth();
  const selfLoad = initialWatching === undefined && isSignedIn === true;

  useEffect(() => {
    if (!selfLoad) return;

    let live = true;
    fetch("/api/watchlist")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { coins?: { coinId: string }[] } | null) => {
        if (!live || !body?.coins) return;
        setWatching(body.coins.some((coin) => coin.coinId === coinId));
      })
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [selfLoad, coinId]);

  const toggle = async () => {
    if (busy) return;

    const next = !watching;
    setWatching(next);
    setBusy(true);
    setError(null);

    try {
      const res = next
        ? await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coinId }),
          })
        : await fetch(`/api/watchlist?coinId=${encodeURIComponent(coinId)}`, {
            method: "DELETE",
          });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setWatching(!next);
        setError(body.error ?? "That did not save.");
      }
    } catch {
      setWatching(!next);
      setError("That did not save.");
    } finally {
      setBusy(false);
    }
  };

  const star = (
    <Star
      filled={watching}
      className={watching ? "text-ink" : "text-ink-muted"}
    />
  );

  return (
    <>
      <SignedIn>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={watching}
          title={error ?? (watching ? "Stop following" : "Follow this coin")}
          className={`press inline-flex items-center gap-2 rounded-md ${
            label
              ? "border border-line-strong px-3 py-2 text-sm hover:bg-surface-raised"
              : "p-1.5 hover:bg-surface-raised"
          } ${error ? "text-down" : ""}`}
        >
          {star}
          {label && <span>{watching ? "Following" : "Follow"}</span>}
        </button>
      </SignedIn>

      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            title="Sign in to follow this coin"
            className={`press inline-flex items-center gap-2 rounded-md text-ink-muted ${
              label
                ? "border border-line-strong px-3 py-2 text-sm hover:bg-surface-raised"
                : "p-1.5 hover:bg-surface-raised"
            }`}
          >
            <Star filled={false} />
            {label && <span>Follow</span>}
          </button>
        </SignInButton>
      </SignedOut>
    </>
  );
}

function Star({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3.5l2.6 5.56 5.9.78-4.3 4.2 1.08 6.06L12 17.2l-5.28 2.9L7.8 14.04l-4.3-4.2 5.9-.78z" />
    </svg>
  );
}
