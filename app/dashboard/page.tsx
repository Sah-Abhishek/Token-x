import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import PageShell from "../components/PageShell";
import OpenOrders from "../components/OpenOrders";
import WatchlistTable from "../components/WatchlistTable";
import { getCurrentDbUser, isDatabaseUnreachable } from "../lib/user";
import { getPortfolio, getRecentTrades, type Portfolio, type TradeRow } from "../lib/portfolio";
import { runFills } from "../lib/orders";
import { getWatchlist, type WatchRow } from "../lib/watchlist";
import {
  formatUsd,
  formatAmount,
  formatPercent,
  signalTextClass,
  signalClasses,
} from "../lib/format";

export const metadata: Metadata = { title: "Dashboard" };

// Account data is per-user and must never be served from a shared cache.
export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: number;
}) {
  return (
    <div className="border-t-2 border-ink pt-4">
      <div className="text-sm text-ink-muted">{label}</div>
      <div
        className={`mt-1 font-mono text-2xl font-medium tracking-tight ${
          tone === undefined ? "" : signalTextClass(tone)
        }`}
        data-numeric
      >
        {value}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  let portfolio: Portfolio;
  let trades: TradeRow[];
  let watching: WatchRow[];

  try {
    const user = await getCurrentDbUser();

    if (!user) {
      return (
        <PageShell>
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">Dashboard</h1>
          <div className="mt-6 max-w-xl rounded-lg border border-line bg-surface-sunken p-6">
            <p className="font-medium">Sign in to see your balance and positions</p>
            <p className="mt-2 text-sm text-ink-muted">
              Every new account starts with $5,000 of virtual balance. No card
              and no deposit.
            </p>
            <SignInButton mode="modal">
              <button className="press mt-5 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-ink-inverse hover:opacity-90">
                Sign in
              </button>
            </SignInButton>
          </div>
        </PageShell>
      );
    }

    // Resting orders are re-priced before the balance is read, so a limit the
    // market has reached shows as filled on this page rather than as money
    // that is still reserved.
    await runFills(user.id);

    [portfolio, trades, watching] = await Promise.all([
      getPortfolio(user.id),
      getRecentTrades(user.id),
      getWatchlist(user.id),
    ]);
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
      return (
        <PageShell>
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">Dashboard</h1>
          <div className="mt-6 max-w-xl rounded-lg border border-line bg-surface-sunken p-6">
            <p className="font-medium">The database is not reachable</p>
            <p className="mt-2 text-sm text-ink-muted">
              Balances and positions live in Postgres, so this page needs it.
              Market data and charts still work in the meantime.
            </p>
            <Link
              href="/market"
              className="press mt-5 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-ink-inverse hover:opacity-90"
            >
              Open the market
            </Link>
          </div>
        </PageShell>
      );
    }
    throw error;
  }

  const { balanceUSD, positions, holdingsValue, totalValue, totalPnl, totalReturnPct } = portfolio;

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">Dashboard</h1>
        <Link
          href="/market"
          className="press rounded-md border border-line-strong px-4 py-2 text-sm text-ink-body hover:bg-surface-raised"
        >
          Open the market
        </Link>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total value" value={formatUsd(totalValue)} />
        <Stat label="Cash balance" value={formatUsd(balanceUSD)} />
        <Stat label="Holdings value" value={formatUsd(holdingsValue)} />
        <Stat
          label="Return since start"
          value={formatPercent(totalReturnPct)}
          tone={totalReturnPct}
        />
      </div>

      {/* ------------------------------------------------------- Positions */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold">Positions</h2>

        {positions.length === 0 ? (
          <div className="mt-5 rounded-lg border border-line bg-surface-sunken p-8">
            <p className="font-medium">You have not opened a position yet</p>
            <p className="mt-2 max-w-md text-sm text-ink-muted">
              Your balance of {formatUsd(balanceUSD)} is ready. Pick a coin and
              place a buy order to start.
            </p>
            <Link
              href="/market"
              className="press mt-5 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-ink-inverse hover:opacity-90"
            >
              Browse coins
            </Link>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted">
                  <th scope="col" className="pb-3 text-left font-normal">Coin</th>
                  <th scope="col" className="pb-3 text-right font-normal">Amount</th>
                  <th scope="col" className="pb-3 text-right font-normal">Avg cost</th>
                  <th scope="col" className="pb-3 text-right font-normal">Price</th>
                  <th scope="col" className="pb-3 text-right font-normal">Value</th>
                  <th scope="col" className="pb-3 text-right font-normal">Profit / loss</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.symbol} className="border-b border-line">
                    <td className="py-4 font-medium">{position.symbol}</td>
                    <td className="py-4 px-4 text-right font-mono text-sm" data-numeric>
                      {formatAmount(position.amount)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-ink-muted" data-numeric>
                      {formatUsd(position.avgCost)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm" data-numeric>
                      {formatUsd(position.price)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm" data-numeric>
                      {formatUsd(position.value)}
                    </td>
                    <td
                      className={`py-4 pl-4 text-right font-mono text-sm ${signalTextClass(position.pnl)}`}
                      data-numeric
                    >
                      {position.pnl >= 0 ? "+" : ""}
                      {formatUsd(position.pnl)} ({formatPercent(position.pnlPct)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-4 text-sm text-ink-muted">
              Unrealised profit across all positions:{" "}
              <span className={`font-mono font-medium ${signalTextClass(totalPnl)}`} data-numeric>
                {totalPnl >= 0 ? "+" : ""}
                {formatUsd(totalPnl)}
              </span>
            </p>
          </div>
        )}
      </section>

      {/* ----------------------------------------------------- Limit orders */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold">Limit orders</h2>
        <div className="mt-5">
          <OpenOrders />
        </div>
      </section>

      {/* ---------------------------------------------------------- Trades */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold">Recent orders</h2>

        {trades.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">No orders yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted">
                  <th scope="col" className="pb-3 text-left font-normal">Side</th>
                  <th scope="col" className="pb-3 text-left font-normal">Coin</th>
                  <th scope="col" className="pb-3 text-right font-normal">Amount</th>
                  <th scope="col" className="pb-3 text-right font-normal">Fill price</th>
                  <th scope="col" className="pb-3 text-right font-normal">Total</th>
                  <th scope="col" className="pb-3 text-right font-normal">When</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-line">
                    <td className="py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${signalClasses(
                          trade.type === "BUY" ? 1 : -1,
                        )}`}
                      >
                        {trade.type === "BUY" ? "Buy" : "Sell"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{trade.symbol}</td>
                    <td className="py-3 px-4 text-right font-mono text-sm" data-numeric>
                      {formatAmount(trade.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-ink-muted" data-numeric>
                      {formatUsd(trade.pricePerToken)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm" data-numeric>
                      {formatUsd(trade.total)}
                    </td>
                    <td className="py-3 pl-4 text-right text-sm text-ink-muted">
                      {new Date(trade.createdAt).toLocaleString("en-US", {
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

      {/* ------------------------------------------------------- Watchlist */}
      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-semibold">Watchlist</h2>
          <Link
            href="/watchlist"
            className="press rounded-md border border-line-strong px-4 py-2 text-sm text-ink-body hover:bg-surface-raised"
          >
            Open watchlist
          </Link>
        </div>
        <WatchlistTable initial={watching.slice(0, 6)} />
      </section>
    </PageShell>
  );
}
