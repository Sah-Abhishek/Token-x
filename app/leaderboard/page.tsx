import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "../components/PageShell";
import { getCurrentDbUser, isDatabaseUnreachable } from "../lib/user";
import { getLeaderboard, type LeaderRow, type Leaderboard } from "../lib/leaderboard";
import { formatUsd, formatPercent, signalTextClass } from "../lib/format";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Every TokenX account ranked by the value of what it holds.",
};

// Equity moves with the market, so this is never served from a shared cache.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  let board: Leaderboard;
  let signedIn = false;

  try {
    const user = await getCurrentDbUser();
    signedIn = Boolean(user);
    board = await getLeaderboard(user?.id);
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
      return (
        <PageShell>
          <Heading />
          <div className="mt-6 max-w-xl rounded-lg border border-line bg-surface-sunken p-6">
            <p className="font-medium">The database is not reachable</p>
            <p className="mt-2 text-sm text-ink-muted">
              The ranking is computed from everyone&rsquo;s balances and
              holdings, so this page needs Postgres. Market data still works.
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

  // Shown below the table when the reader ranks outside the visible cut, so
  // they always find themselves somewhere on the page.
  const youBelowTheCut =
    board.you && !board.rows.some((row) => row.userId === board.you?.userId)
      ? board.you
      : null;

  return (
    <PageShell>
      <Heading total={board.total} />

      {!board.priced && (
        <p className="mt-6 rounded-md border border-line bg-surface-sunken p-4 text-sm text-ink-muted">
          The price feed is not responding, so holdings are valued at zero and
          this ranking is only counting cash. It corrects itself as soon as
          prices return.
        </p>
      )}

      {board.rows.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">
          No accounts yet. The first person to sign up tops the table by
          default.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line text-xs text-ink-muted">
                <th scope="col" className="pb-3 pr-4 text-left font-normal">Rank</th>
                <th scope="col" className="pb-3 px-4 text-left font-normal">Trader</th>
                <th scope="col" className="hidden pb-3 px-4 text-right font-normal sm:table-cell">Positions</th>
                <th scope="col" className="hidden pb-3 px-4 text-right font-normal md:table-cell">Orders</th>
                <th scope="col" className="hidden pb-3 px-4 text-right font-normal lg:table-cell">Cash</th>
                <th scope="col" className="hidden pb-3 px-4 text-right font-normal lg:table-cell">Holdings</th>
                <th scope="col" className="pb-3 px-4 text-right font-normal">Total value</th>
                <th scope="col" className="pb-3 pl-4 text-right font-normal">Return</th>
              </tr>
            </thead>
            <tbody>
              {board.rows.map((row) => (
                <Row key={row.userId} row={row} />
              ))}
            </tbody>
          </table>

          {youBelowTheCut && (
            <table className="mt-6 w-full border-collapse border-t-2 border-ink">
              <tbody>
                <Row row={youBelowTheCut} />
              </tbody>
            </table>
          )}
        </div>
      )}

      {!signedIn && (
        <p className="mt-8 text-sm text-ink-muted">
          <Link href="/market" className="underline underline-offset-4">
            Open an account
          </Link>{" "}
          and you appear here from your first order.
        </p>
      )}

      <p className="mt-10 max-w-[70ch] text-sm text-ink-muted">
        Total value is cash plus every holding priced at the live market, and
        return is measured against the {formatUsd(5000)} every account opens
        with. Nothing is stored: the figures are recomputed each time the page
        is opened, because a saved number would be wrong the moment the market
        moved.
      </p>
    </PageShell>
  );
}

function Heading({ total }: { total?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">Leaderboard</h1>
        <p className="mt-2 text-ink-muted">
          {total === undefined
            ? "Every account, ranked by what it is worth right now."
            : `${total} ${total === 1 ? "account" : "accounts"}, ranked by what they are worth right now.`}
        </p>
      </div>
      <Link
        href="/dashboard"
        className="press rounded-md border border-line-strong px-4 py-2 text-sm text-ink-body hover:bg-surface-raised"
      >
        Your dashboard
      </Link>
    </div>
  );
}

function Row({ row }: { row: LeaderRow }) {
  return (
    <tr
      className={`border-b border-line ${row.isYou ? "bg-surface-raised" : ""}`}
      aria-current={row.isYou ? "true" : undefined}
    >
      <td className="py-4 pr-4 font-mono text-sm text-ink-muted" data-numeric>
        {row.rank}
      </td>
      <td className="py-4 px-4">
        <span className="font-medium">{row.username}</span>
        {row.isYou && <span className="ml-2 text-xs text-ink-muted">you</span>}
      </td>
      <td className="hidden py-4 px-4 text-right font-mono text-sm text-ink-muted sm:table-cell" data-numeric>
        {row.positions}
      </td>
      <td className="hidden py-4 px-4 text-right font-mono text-sm text-ink-muted md:table-cell" data-numeric>
        {row.trades}
      </td>
      <td className="hidden py-4 px-4 text-right font-mono text-sm text-ink-muted lg:table-cell" data-numeric>
        {formatUsd(row.balanceUSD)}
      </td>
      <td className="hidden py-4 px-4 text-right font-mono text-sm text-ink-muted lg:table-cell" data-numeric>
        {formatUsd(row.holdingsValue)}
      </td>
      <td className="py-4 px-4 text-right font-mono text-sm font-medium" data-numeric>
        {formatUsd(row.totalValue)}
      </td>
      <td
        className={`py-4 pl-4 text-right font-mono text-sm ${signalTextClass(row.returnPct)}`}
        data-numeric
      >
        {formatPercent(row.returnPct)}
      </td>
    </tr>
  );
}
