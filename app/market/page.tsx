import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "../components/PageShell";
import ClientSearchAndFilter from "../components/ClientSearchAndFilter";
import { getMarkets } from "../lib/market";

export const metadata: Metadata = {
  // The root layout appends "| TokenX" through its title template, so the
  // title here must not repeat it.
  title: "Market",
  description: "Live prices and 24h movement for the top 250 coins.",
};

/** Rebuild this page's data at most once a minute. */
export const revalidate = 60;

export default async function MarketPage() {
  // Calls the data layer directly. This previously fetched our own
  // /api/cryptos over HTTP using process.env.API_URL, which meant an unset
  // API_URL in production rendered an empty table with no error.
  const cryptocurrencies = await getMarkets();

  return (
    <PageShell>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">Market</h1>
          <p className="mt-2 text-ink-muted">
            The top 250 coins by market cap, priced live and refreshed every
            minute.
          </p>
        </div>
        <Link
          href="/watchlist"
          className="press rounded-md border border-line-strong px-4 py-2 text-sm text-ink-body hover:bg-surface-raised"
        >
          Your watchlist
        </Link>
      </header>

      {cryptocurrencies.length === 0 ? (
        <div
          role="status"
          className="animate-fade-in rounded-lg border border-line bg-surface p-10 text-center"
        >
          <p className="mb-1 font-medium">Market data is temporarily unavailable</p>
          <p className="text-sm text-ink-muted">
            The price feed did not respond. Refresh in a moment to try again.
          </p>
        </div>
      ) : (
        <ClientSearchAndFilter cryptocurrencies={cryptocurrencies} />
      )}

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">
          Open a coin to trade it
        </h2>
        <p className="mt-2 max-w-[60ch] text-ink-muted">
          Every coin has its own chart, an order ticket and your position in
          it. Orders fill at the live price with virtual money.
        </p>
        <Link
          href="/market/bitcoin"
          className="press mt-6 inline-block rounded-md bg-ink px-6 py-3 font-medium text-ink-inverse hover:opacity-90"
        >
          Trade Bitcoin
        </Link>
      </section>
    </PageShell>
  );
}
