"use client";

import { useCallback, useEffect, useState } from "react";
import CoinFlipGame from "./CoinFlipGame";
import DiceGame from "./DiceGame";
import PredictionGame, { type PredictionCoin } from "./PredictionGame";
import type { BetRow, GameStats } from "@/app/lib/games";
import { formatUsd, signalTextClass } from "@/app/lib/format";

/** Mirrors the server's rules so the controls can state the odds without a
 *  round trip. The server remains the only thing that decides an outcome. */
export type GameRules = {
  stakeMin: number;
  stakeMax: number;
  coinMultiplier: number;
  predictionMultiplier: number;
  diceMinTarget: number;
  diceMaxTarget: number;
  houseEdge: number;
};

export default function GamesClient({
  initialBalance,
  initialBets,
  initialStats,
  coins,
  rules,
}: {
  initialBalance: number;
  initialBets: BetRow[];
  initialStats: GameStats;
  coins: PredictionCoin[];
  rules: GameRules;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [bets, setBets] = useState(initialBets);
  const [stats, setStats] = useState(initialStats);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/games");
      if (!res.ok) return;

      const body = await res.json();
      setBalance(body.balanceUSD as number);
      setBets(body.bets as BetRow[]);
      setStats(body.stats as GameStats);
    } catch {
      // A failed refresh leaves the last known figures on screen rather than
      // blanking them; the next action pulls again.
    }
  }, []);

  // Settle anything that finished while the page was closed.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const recordPlay = (bet: BetRow, balanceUSD: number) => {
    setBalance(balanceUSD);
    setBets((current) => [bet, ...current].slice(0, 25));
    refresh();
  };

  const diceMultiplier = (target: number) =>
    Math.round((100 / Math.max(1, 100 - target)) * (1 - rules.houseEdge) * 100) / 100;

  const running = bets.filter(
    (bet) => bet.gameType === "PRICE_PREDICTION" && bet.outcome === null,
  );

  return (
    <>
      <dl className="mt-8 grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        <Tile label="Balance" value={formatUsd(balance)} />
        <Tile label="Rounds played" value={String(stats.played)} />
        <Tile
          label="Won / lost"
          value={`${stats.won} / ${stats.lost}`}
          note={stats.open > 0 ? `${stats.open} still running` : undefined}
        />
        <Tile
          label="Net across all rounds"
          value={`${stats.net >= 0 ? "+" : ""}${formatUsd(stats.net)}`}
          tone={stats.net}
        />
      </dl>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <CoinFlipGame
          balance={balance}
          multiplier={rules.coinMultiplier}
          min={rules.stakeMin}
          max={rules.stakeMax}
          onPlayed={recordPlay}
        />

        <DiceGame
          balance={balance}
          min={rules.stakeMin}
          max={rules.stakeMax}
          minTarget={rules.diceMinTarget}
          maxTarget={rules.diceMaxTarget}
          multiplierFor={diceMultiplier}
          onPlayed={recordPlay}
        />

        <PredictionGame
          balance={balance}
          coins={coins}
          multiplier={rules.predictionMultiplier}
          min={rules.stakeMin}
          max={rules.stakeMax}
          open={running}
          onPlayed={recordPlay}
          onSettleDue={refresh}
        />
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Recent rounds</h2>

        {bets.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            Nothing played yet. Every round above is settled on the server and
            written to your account, the same as a trade.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted">
                  <th scope="col" className="pb-3 pr-4 text-left font-normal">Game</th>
                  <th scope="col" className="pb-3 px-4 text-left font-normal">Called</th>
                  <th scope="col" className="pb-3 px-4 text-left font-normal">Result</th>
                  <th scope="col" className="pb-3 px-4 text-right font-normal">Stake</th>
                  <th scope="col" className="pb-3 px-4 text-right font-normal">Net</th>
                  <th scope="col" className="pb-3 pl-4 text-right font-normal">When</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet) => (
                  <tr key={bet.id} className="border-b border-line">
                    <td className="py-3 pr-4 text-sm font-medium">{gameLabel(bet)}</td>
                    <td className="py-3 px-4 text-sm text-ink-body">{calledLabel(bet)}</td>
                    <td className="py-3 px-4 text-sm text-ink-body">{resultLabel(bet)}</td>
                    <td className="py-3 px-4 text-right font-mono text-sm" data-numeric>
                      {formatUsd(bet.betAmount)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono text-sm ${
                        bet.net === null ? "text-ink-muted" : signalTextClass(bet.net)
                      }`}
                      data-numeric
                    >
                      {bet.net === null
                        ? "—"
                        : `${bet.net >= 0 ? "+" : ""}${formatUsd(bet.net)}`}
                    </td>
                    <td className="py-3 pl-4 text-right text-sm text-ink-muted">
                      {new Date(bet.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Tile({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: number;
}) {
  return (
    <div className="bg-surface px-5 py-5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd>
        <div
          className={`mt-1.5 font-mono text-2xl font-medium tracking-tight ${
            tone === undefined ? "" : signalTextClass(tone)
          }`}
          data-numeric
        >
          {value}
        </div>
        {note && <div className="mt-1 text-xs text-ink-muted">{note}</div>}
      </dd>
    </div>
  );
}

function gameLabel(bet: BetRow): string {
  if (bet.gameType === "COIN_FLIP") return "Coin flip";
  if (bet.gameType === "DICE") return "Dice";
  return "Prediction";
}

function calledLabel(bet: BetRow): string {
  if (bet.gameType === "DICE") return `over ${bet.target ?? 0}`;
  if (bet.gameType === "PRICE_PREDICTION") {
    return `${bet.choice?.toLowerCase() ?? ""} on ${bet.coinId?.replace(/-/g, " ") ?? ""}`;
  }
  return bet.choice?.toLowerCase() ?? "";
}

function resultLabel(bet: BetRow): string {
  if (bet.outcome === null) return "running";
  if (bet.gameType === "PRICE_PREDICTION") {
    return `${formatUsd(bet.entryPrice)} to ${formatUsd(bet.settlePrice)}`;
  }
  return bet.result?.toLowerCase() ?? "";
}
