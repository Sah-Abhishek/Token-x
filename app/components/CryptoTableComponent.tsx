"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import type { Crypto } from "../lib/market";
import { formatCompactUsd, formatUsd, formatPercent, signalClasses } from "../lib/format";

interface ClientCryptoTableProps {
  cryptos: Crypto[];
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
}

// Sentence case, not tracked-out caps: the landing table sets the house
// style for column headings and the two tables sit two clicks apart.
const TH = "px-6 py-3 text-left text-xs font-normal text-ink-muted";
const TD = "px-6 py-4 whitespace-nowrap text-sm";

/**
 * Which coins the reader follows.
 *
 * One fetch for the whole table: a star per row that asked for itself would
 * be ten requests a page. Signed-out readers are not asked at all, since the
 * only answer available to them is a 401.
 */
function useWatched() {
  const { isSignedIn } = useAuth();
  const [ids, setIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setIds(null);
      return;
    }

    let live = true;
    fetch("/api/watchlist")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { coins?: { coinId: string }[] } | null) => {
        if (live && body?.coins) setIds(new Set(body.coins.map((coin) => coin.coinId)));
      })
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [isSignedIn]);

  const toggle = useCallback(
    async (coinId: string) => {
      const watching = ids?.has(coinId) ?? false;

      // Move the star first and put it back if the server disagrees.
      setIds((current) => {
        const next = new Set(current ?? []);
        if (watching) next.delete(coinId);
        else next.add(coinId);
        return next;
      });

      try {
        const res = watching
          ? await fetch(`/api/watchlist?coinId=${encodeURIComponent(coinId)}`, { method: "DELETE" })
          : await fetch("/api/watchlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ coinId }),
            });

        if (!res.ok) throw new Error("rejected");
      } catch {
        setIds((current) => {
          const next = new Set(current ?? []);
          if (watching) next.add(coinId);
          else next.delete(coinId);
          return next;
        });
      }
    },
    [ids],
  );

  return { ids, toggle, signedIn: Boolean(isSignedIn) };
}

export default function ClientCryptoTable({
  cryptos,
  currentPage,
  totalPages,
  onNextPage,
  onPrevPage,
}: ClientCryptoTableProps) {
  const watched = useWatched();
  if (cryptos.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-lg p-10 text-center">
        <p className="font-medium mb-1">No coins match your search</p>
        <p className="text-sm text-ink-muted">Try a different name or clear the filter.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-surface rounded-lg border border-line overflow-x-auto">
        <table className="min-w-full divide-y divide-line">
          <thead className="bg-surface-sunken">
            <tr>
              <th scope="col" className={TH}>Rank</th>
              <th scope="col" className={TH}>Name</th>
              <th scope="col" className={`${TH} text-right`}>Price</th>
              <th scope="col" className={`${TH} text-right`}>24h change</th>
              <th scope="col" className={`${TH} text-right`}>Market cap</th>
              <th scope="col" className={`${TH} text-right`}>Volume</th>
              <th scope="col" className={`${TH} text-right`}>Action</th>
              <th scope="col" className={`${TH} text-right`}>
                <span className="sr-only">Follow</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cryptos.map((crypto, index) => (
              <tr key={crypto.id} className="hover:bg-surface-sunken transition-colors">
                <td className={`${TD} font-medium text-ink-muted`} data-numeric>
                  {(currentPage - 1) * 10 + index + 1}
                </td>
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    {crypto.image ? (
                      <Image
                        src={crypto.image}
                        alt=""
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-surface-raised" />
                    )}
                    <span className="font-medium text-ink">{crypto.name}</span>
                    <span className="text-ink-muted text-xs uppercase">{crypto.symbol}</span>
                  </div>
                </td>
                {/* Raw numbers formatted here, once. The API used to send
                    pre-formatted strings that lost precision in transit. */}
                <td className={`${TD} text-right text-ink`} data-numeric>
                  {formatUsd(crypto.price)}
                </td>
                <td className={`${TD} text-right`} data-numeric>
                  <span
                    className={`inline-block font-medium px-1.5 py-0.5 rounded ${signalClasses(crypto.change)}`}
                  >
                    {formatPercent(crypto.change)}
                  </span>
                </td>
                <td className={`${TD} text-right text-ink-body`} data-numeric>
                  {formatCompactUsd(crypto.marketCap)}
                </td>
                <td className={`${TD} text-right text-ink-body`} data-numeric>
                  {formatCompactUsd(crypto.volume)}
                </td>
                <td className={`${TD} text-right`}>
                  <Link
                    href={`/market/${crypto.id}`}
                    className="inline-block bg-surface-raised text-ink-body py-1 px-3 rounded-md hover:bg-line-strong hover:text-ink transition-colors"
                  >
                    Trade
                  </Link>
                </td>
                <td className={`${TD} text-right`}>
                  {watched.signedIn && (
                    <button
                      type="button"
                      onClick={() => watched.toggle(crypto.id)}
                      aria-pressed={watched.ids?.has(crypto.id) ?? false}
                      title={
                        watched.ids?.has(crypto.id)
                          ? `Stop following ${crypto.name}`
                          : `Follow ${crypto.name}`
                      }
                      className="press rounded-md p-1.5 hover:bg-surface-raised"
                    >
                      <Star filled={watched.ids?.has(crypto.id) ?? false} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav
        aria-label="Pagination"
        className="flex justify-between items-center p-4 mt-6 bg-surface-sunken rounded-lg border border-line"
      >
        <button
          onClick={onPrevPage}
          disabled={currentPage === 1}
          className="px-4 py-2 rounded-md text-sm font-medium bg-surface-raised hover:bg-line-strong transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-raised"
        >
          Previous
        </button>
        <span className="text-sm text-ink-muted" data-numeric>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className="px-4 py-2 rounded-md text-sm font-medium bg-surface-raised hover:bg-line-strong transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-raised"
        >
          Next
        </button>
      </nav>
    </div>
  );
}

function Star({ filled }: { filled: boolean }) {
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
      className={filled ? "text-ink" : "text-ink-muted"}
    >
      <path d="M12 3.5l2.6 5.56 5.9.78-4.3 4.2 1.08 6.06L12 17.2l-5.28 2.9L7.8 14.04l-4.3-4.2 5.9-.78z" />
    </svg>
  );
}
