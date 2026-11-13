"use client";

import { useState } from "react";
import GamePanel from "./GamePanel";
import StakeField from "./StakeField";
import { Result } from "./CoinFlipGame";
import type { BetRow } from "@/app/lib/games";
import { formatUsd } from "@/app/lib/format";

export default function DiceGame({
  balance,
  min,
  max,
  minTarget,
  maxTarget,
  multiplierFor,
  onPlayed,
}: {
  balance: number;
  min: number;
  max: number;
  minTarget: number;
  maxTarget: number;
  multiplierFor: (target: number) => number;
  onPlayed: (bet: BetRow, balanceUSD: number) => void;
}) {
  const [target, setTarget] = useState(50);
  const [stake, setStake] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<BetRow | null>(null);

  const chance = 100 - target;
  const multiplier = multiplierFor(target);

  const roll = async () => {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "DICE", stake, target }),
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

  const rolled = last ? Number(last.result) : null;
  const lastTarget = last?.target ?? target;

  return (
    <GamePanel
      title="Dice"
      description="A number from 1 to 100. Beat your target and you win."
      odds={`${chance} in 100, ${multiplier}x on a win`}
      result={
        last && rolled !== null && (
          <>
            <Track target={lastTarget} rolled={rolled} won={last.outcome === "WIN"} />
            <div className="mt-4">
              <Result
                won={last.outcome === "WIN"}
                headline={`Rolled ${rolled}`}
                detail={
                  last.outcome === "WIN"
                    ? `Over ${lastTarget}, so you won ${formatUsd((last.payout ?? 0) - last.betAmount)}.`
                    : `Not over ${lastTarget}, so you lost ${formatUsd(last.betAmount)}.`
                }
              />
            </div>
          </>
        )
      }
    >
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <label htmlFor="dice-target" className="text-sm font-medium text-ink-body">
            Roll over
          </label>
          <span className="font-mono text-sm font-medium" data-numeric>
            {target}
          </span>
        </div>
        <input
          id="dice-target"
          type="range"
          min={minTarget}
          max={maxTarget}
          step={1}
          value={target}
          disabled={busy}
          onChange={(event) => setTarget(Number(event.target.value))}
          className="w-full accent-[var(--color-ink)]"
        />
        <p className="mt-1 text-xs text-ink-muted">
          A higher target wins less often and pays more. The 1% the house keeps
          is already in that multiplier.
        </p>
      </div>

      <StakeField
        id="dice-stake"
        stake={stake}
        onChange={setStake}
        balance={balance}
        min={min}
        max={max}
        disabled={busy}
      />

      <button
        type="button"
        onClick={roll}
        disabled={busy}
        className="press w-full rounded-md bg-ink py-3 font-medium text-ink-inverse hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Rolling…" : "Roll"}
      </button>

      {error && <p className="text-sm text-down">{error}</p>}
    </GamePanel>
  );
}

/** Where the roll landed on the 1..100 line, against the target. The losing
 *  stretch is tinted, so the result is readable without reading the number. */
function Track({ target, rolled, won }: { target: number; rolled: number; won: boolean }) {
  return (
    <div>
      <div className="relative h-2 rounded-full bg-up-surface">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 rounded-l-full bg-down-surface"
          style={{ width: `${target}%` }}
        />
        <span
          aria-hidden="true"
          className={`absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full ${
            won ? "bg-up" : "bg-down"
          }`}
          style={{ left: `${Math.min(100, Math.max(0, rolled))}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-muted" data-numeric>
        <span>1</span>
        <span>target {target}</span>
        <span>100</span>
      </div>
    </div>
  );
}
