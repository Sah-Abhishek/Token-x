import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import PageShell from "../components/PageShell";
import WatchlistTable from "../components/WatchlistTable";
import { getCurrentDbUser, isDatabaseUnreachable } from "../lib/user";
import { getWatchlist, type WatchRow } from "../lib/watchlist";

export const metadata: Metadata = {
  title: "Watchlist",
  description: "The coins you follow, with live prices.",
};

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  let rows: WatchRow[];

  try {
    const user = await getCurrentDbUser();

    if (!user) {
      return (
        <PageShell>
          <Heading />
          <div className="mt-6 max-w-xl rounded-lg border border-line bg-surface-sunken p-6">
            <p className="font-medium">Sign in to keep a watchlist</p>
            <p className="mt-2 text-sm text-ink-muted">
              A watchlist is tied to an account, so the coins you follow are
              still there on your next visit.
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

    rows = await getWatchlist(user.id);
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
      return (
        <PageShell>
          <Heading />
          <div className="mt-6 max-w-xl rounded-lg border border-line bg-surface-sunken p-6">
            <p className="font-medium">The database is not reachable</p>
            <p className="mt-2 text-sm text-ink-muted">
              Your watchlist lives in Postgres, so this page needs it. Market
              data and charts still work.
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

  return (
    <PageShell>
      <Heading count={rows.length} />
      <WatchlistTable initial={rows} />
    </PageShell>
  );
}

function Heading({ count }: { count?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">Watchlist</h1>
        <p className="mt-2 text-ink-muted">
          {count === undefined
            ? "The coins you follow, with live prices."
            : count === 0
              ? "The coins you follow will show up here."
              : `${count} ${count === 1 ? "coin" : "coins"}, priced live.`}
        </p>
      </div>
      <Link
        href="/market"
        className="press rounded-md border border-line-strong px-4 py-2 text-sm text-ink-body hover:bg-surface-raised"
      >
        Open the market
      </Link>
    </div>
  );
}
