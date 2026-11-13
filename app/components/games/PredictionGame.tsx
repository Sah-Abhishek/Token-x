"use client";

import { useEffect, useState } from "react";
import GamePanel from "./GamePanel";
import StakeField from "./StakeField";
import type { BetRow } from "@/app/lib/games";
import { formatUsd } from "@/app/lib/format";

export type PredictionCoin = { id: string; symbol: string; name: string };

const WINDOWS: { seconds: number; label: string }[] = [
  { seconds: 60, label: "1 min" },
  { seconds: 300, label: "5 min" },
  { seconds: 900, label: "15 min" },
];

export default function PredictionGame({
  balance,
  coins,
  multiplier,
  min,
  max,
  open,
  onPlayed,
  onSettleDue,
}: {
  balance: number;
  coins: PredictionCoin[];
  multiplier: number;
  min: number;
  max: number;
  /** Predictions still running, newest first. */
  open: BetRow[];
  onPlayed: (bet: BetRow, balanceUSD: number) => void;
  /** Called once a running prediction's window has closed, so the parent can
   *  re-read and let the server settle it. */
  onSettleDue: () => void;
}) {
  const [coinId, setCoinId] = useState(coins[0]?.id ?? "bitcoin");
  const [choice, setChoice] = useState<"UP" | "DOWN">("UP");
  const [seconds, setSeconds] = useState(60);
  const [stake, setStake] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const place = async () => {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "PRICE_PREDICTION", stake, coinId, choice, seconds }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "The prediction could not be placed.");
        return;
      }

      onPlayed(body.bet as BetRow, body.balanceUSD as number);
    } catch {
      setError("The prediction could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GamePanel
      title="Price prediction"
      description="Call which way a coin moves over a fixed window."
      odds={`${multiplier}x on a win, stake back on an exact tie`}
      result={
        open.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-ink">Running</h3>
            <ul className="mt-3 space-y-2">
              {open.map((bet) => (
                <Running key={bet.id} bet={bet} onDue={onSettleDue} />
              ))}
            </ul>
          </div>
        )
      }
    >
      <div>
        <label htmlFor="prediction-coin" className="mb-1 block text-sm font-medium text-ink-body">
          Coin
        </label>
        <select
          id="prediction-coin"
          value={coinId}
          disabled={busy}
          onChange={(event) => setCoinId(event.target.value)}
          className="w-full rounded-md border border-line-strong bg-surface p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ink disabled:opacity-50"
        >
          {coins.map((coin) => (
            <option key={coin.id} value={coin.id}>
              {coin.name} ({coin.symbol})
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-ink-body">Direction</span>
        <div className="grid grid-cols-2 gap-2">
          {(["UP", "DOWN"] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              aria-pressed={choice === direction}
              onClick={() => setChoice(direction)}
              className={`press rounded-md border py-3 text-sm font-medium ${
                choice === direction
                  ? direction === "UP"
                    ? "border-up bg-up-surface text-up"
                    : "border-down bg-down-surface text-down"
                  : "border-line-strong text-ink-body hover:bg-surface-raised"
              }`}
            >
              {direction === "UP" ? "Up" : "Down"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-ink-body">Window</span>
        <div className="grid grid-cols-3 gap-2">
          {WINDOWS.map((window) => (
            <button
              key={window.seconds}
              type="button"
              aria-pressed={seconds === window.seconds}
              onClick={() => setSeconds(window.seconds)}
              className={`press rounded-md border py-2 text-sm ${
                seconds === window.seconds
                  ? "border-ink bg-ink text-ink-inverse"
                  : "border-line-strong text-ink-body hover:bg-surface-raised"
              }`}
            >
              {window.label}
            </button>
          ))}
        </div>
      </div>

      <StakeField
        id="prediction-stake"
        stake={stake}
        onChange={setStake}
        balance={balance}
        min={min}
        max={max}
        disabled={busy}
      />

      <button
        type="button"
        onClick={place}
        disabled={busy || coins.length === 0}
        className="press w-full rounded-md bg-ink py-3 font-medium text-ink-inverse hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Placing…" : "Place prediction"}
      </button>

      {error && <p className="text-sm text-down">{error}</p>}

      <p className="text-xs text-ink-muted">
        The entry price is taken when you place it and the settle price when
        the window closes, both read on the server. A window that closes while
        the page is shut settles the next time you open it.
      </p>
    </GamePanel>
  );
}

/** One running prediction, counting down to its window. */
function Running({ bet, onDue }: { bet: BetRow; onDue: () => void }) {
  const settleAt = bet.settleAt ? new Date(bet.settleAt).getTime() : 0;
  const [remaining, setRemaining] = useState(() => Math.max(0, settleAt - Date.now()));
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    if (!settleAt) return;

    const tick = () => setRemaining(Math.max(0, settleAt - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [settleAt]);

  useEffect(() => {
    // Ask the parent once, not on every tick after zero. The server decides
    // the outcome; this only prompts the read that lets it.
    if (remaining === 0 && !asked) {
      setAsked(true);
      const timer = window.setTimeout(onDue, 1200);
      return () => window.clearTimeout(timer);
    }
  }, [remaining, asked, onDue]);

  const seconds = Math.ceil(remaining / 1000);

  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2 text-sm">
      <span>
        <span className={bet.choice === "UP" ? "text-up" : "text-down"}>
          {bet.choice === "UP" ? "Up" : "Down"}
        </span>{" "}
        <span className="capitalize">{bet.coinId?.replace(/-/g, " ")}</span>{" "}
        <span className="text-ink-muted">from</span>{" "}
        <span className="font-mono" data-numeric>
          {formatUsd(bet.entryPrice)}
        </span>
      </span>
      <span className="font-mono text-xs text-ink-muted" data-numeric>
        {seconds > 0 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "settling"}
      </span>
    </li>
  );
}
