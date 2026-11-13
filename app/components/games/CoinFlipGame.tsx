"use client";

import { useState } from "react";
import GamePanel from "./GamePanel";
import StakeField from "./StakeField";
import type { BetRow } from "@/app/lib/games";
import { formatUsd } from "@/app/lib/format";

export default function CoinFlipGame({
  balance,
  multiplier,
  min,
  max,
  onPlayed,
}: {
  balance: number;
  multiplier: number;
  min: number;
  max: number;
  onPlayed: (bet: BetRow, balanceUSD: number) => void;
}) {
  const [choice, setChoice] = useState<"HEADS" | "TAILS">("HEADS");
  const [stake, setStake] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<BetRow | null>(null);

  const flip = async () => {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "COIN_FLIP", stake, choice }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "The round could not be played.");
        return;
      }

      setLast(body.bet as BetRow);
      onPlayed(body.bet as BetRow, body.balanceUSD as number);
    } catch {
      setError("The round could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GamePanel
      title="Coin flip"
      description="Call it, then the server flips."
      odds={`Two outcomes, ${multiplier}x on a win`}
      result={
        last && (
          <Result
            won={last.outcome === "WIN"}
            headline={`It landed ${last.result?.toLowerCase()}`}
            detail={
              last.outcome === "WIN"
                ? `You called ${last.choice?.toLowerCase()} and won ${formatUsd(
                    (last.payout ?? 0) - last.betAmount,
                  )}.`
                : `You called ${last.choice?.toLowerCase()} and lost ${formatUsd(last.betAmount)}.`
            }
          />
        )
      }
    >
      <div>
        <span className="mb-1 block text-sm font-medium text-ink-body">Your call</span>
        <div className="grid grid-cols-2 gap-2">
          {(["HEADS", "TAILS"] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-pressed={choice === side}
              onClick={() => setChoice(side)}
              className={`press rounded-md border py-3 text-sm font-medium ${
                choice === side
                  ? "border-ink bg-ink text-ink-inverse"
                  : "border-line-strong text-ink-body hover:bg-surface-raised"
              }`}
            >
              {side === "HEADS" ? "Heads" : "Tails"}
            </button>
          ))}
        </div>
      </div>

      <StakeField
        id="flip-stake"
        stake={stake}
        onChange={setStake}
        balance={balance}
        min={min}
        max={max}
        disabled={busy}
      />

      <button
        type="button"
        onClick={flip}
        disabled={busy}
        className="press w-full rounded-md bg-ink py-3 font-medium text-ink-inverse hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Flipping…" : "Flip"}
      </button>

      {error && <p className="text-sm text-down">{error}</p>}
    </GamePanel>
  );
}

export function Result({
  won,
  headline,
  detail,
}: {
  won: boolean;
  headline: string;
  detail: string;
}) {
  return (
    <div className="animate-rise" key={headline + detail}>
      <p className={`font-medium ${won ? "text-up" : "text-down"}`}>{headline}</p>
      <p className="mt-1 text-sm text-ink-muted">{detail}</p>
    </div>
  );
}
