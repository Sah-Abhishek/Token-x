"use client";

import React from "react";
import Link from "next/link";
import type { Position } from "../lib/portfolio";
import { formatUsd, formatAmount, formatPercent, signalTextClass } from "../lib/format";

interface PortfolioProps {
  symbol: string;
  position: Position | null;
  signedIn: boolean;
  loading: boolean;
  unavailable: string | null;
}

const Portfolio: React.FC<PortfolioProps> = ({
  symbol,
  position,
  signedIn,
  loading,
  unavailable,
}) => {
  const ticker = symbol || "this coin";

  const body = () => {
    if (unavailable) {
      return <p className="text-sm text-ink-muted">{unavailable}</p>;
    }

    if (!signedIn) {
      return (
        <p className="text-sm text-ink-muted">
          Sign in to see what you hold in {ticker}.
        </p>
      );
    }

    if (loading && !position) {
      return <p className="text-sm text-ink-muted animate-pulse-subtle">Loading your position…</p>;
    }

    if (!position) {
      return (
        <p className="text-sm text-ink-muted">
          You do not hold any {ticker} yet. A buy order opens a position.
        </p>
      );
    }

    return (
      <>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <dt className="text-ink-muted">Amount held</dt>
            <dd className="font-mono font-medium" data-numeric>
              {formatAmount(position.amount)} {position.symbol}
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-ink-muted">Average cost</dt>
            <dd className="font-mono font-medium" data-numeric>
              {formatUsd(position.avgCost)}
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-ink-muted">Market value</dt>
            <dd className="font-mono font-medium" data-numeric>
              {formatUsd(position.value)}
            </dd>
          </div>
          <div className="flex justify-between items-center border-t border-line pt-3">
            <dt className="text-ink-muted">Profit / loss</dt>
            <dd className={`font-mono font-medium ${signalTextClass(position.pnl)}`} data-numeric>
              {position.pnl >= 0 ? "+" : ""}
              {formatUsd(position.pnl)} ({formatPercent(position.pnlPct)})
            </dd>
          </div>
        </dl>

        {!position.priced && (
          <p className="mt-4 text-xs text-ink-muted">
            No live price matched {position.symbol}, so the value shown is at cost.
          </p>
        )}
      </>
    );
  };

  return (
    <div className="bg-surface rounded-lg border border-line p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-semibold">Your position</h2>
        {signedIn && !unavailable && (
          <Link href="/dashboard" className="text-xs text-ink-muted hover:text-ink underline underline-offset-4 decoration-line-strong">
            Dashboard
          </Link>
        )}
      </div>

      {body()}
    </div>
  );
};

export default Portfolio;
