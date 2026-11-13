import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CallToAction from "./components/CallToAction";
import HeroChart from "./components/landing/HeroChart";
import TopCoins from "./components/landing/TopCoins";
import TickerTape from "./components/landing/TickerTape";
import StatsBand from "./components/landing/StatsBand";
import Movers from "./components/landing/Movers";
import {
  getGlobalStats,
  getMarkets,
  getMovers,
  getSeries,
  getTopCoinsWithSparkline,
} from "./lib/market";

export const metadata: Metadata = {
  // The root layout appends "| TokenX" via its title template.
  title: "Practice crypto trading on live prices",
  description:
    "Trade crypto at live market prices with a virtual balance. Real data, no real money.",
};

export const revalidate = 60;

/** The three states a new account passes through. Each one is shown through
 *  the value it produces rather than through 01 / 02 / 03 chrome. */
const STEPS = [
  {
    value: "$5,000.00",
    title: "Your account opens funded",
    body: "Signing up creates a virtual balance. There is no card and no deposit.",
  },
  {
    value: "0.0724 BTC",
    title: "You buy at the live price",
    body: "Orders fill at the market price pulled from Binance and CoinGecko.",
  },
  {
    value: "+$312.40",
    title: "You watch the position move",
    body: "Holdings are valued continuously, so gains and losses are the real ones.",
  },
];

const LIVE_NOW = [
  "Live prices and 24h movement for the top 250 coins",
  "Candlestick and line charts on every listed pair",
  "Market orders that fill at the live price, and limit orders that rest",
  "A dashboard with your balance, positions and profit",
  "A watchlist, a leaderboard, and three side games",
];

const NOT_YET = [
  "Spreads, slippage and order book depth: a fill uses one mid price",
  "Fees, funding and partial fills",
  "Leverage, margin and anything that can take you below zero",
];

export default async function Home() {
  // Every call here is cached server-side, and `getMovers` reads the same
  // cached market list as the tape, so the whole page costs one CoinGecko
  // market request and one global request per minute no matter the traffic.
  const [series, coins, stats, movers, markets] = await Promise.all([
    getSeries("BTC", "7D"),
    getTopCoinsWithSparkline(10),
    getGlobalStats(),
    getMovers(),
    getMarkets(),
  ]);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <Navbar />
      <TickerTape coins={markets.slice(0, 18)} />

      {/* ---------------------------------------------------------------- Hero */}
      <section className="border-b border-line">
        <div className="shell grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h1
              className="animate-rise font-semibold leading-[1.04] tracking-[-0.03em] text-[clamp(2.5rem,5.4vw,3.75rem)]"
              style={{ animationDelay: "60ms" }}
            >
              Practice trading on live market prices with money that isn&rsquo;t real.
            </h1>

            <p
              className="animate-rise mt-6 text-lg leading-relaxed text-ink-body max-w-[46ch]"
              style={{ animationDelay: "140ms" }}
            >
              Your account opens with{" "}
              <span className="font-mono font-medium text-ink" data-numeric>
                $5,000
              </span>{" "}
              of virtual balance. The prices are the ones the market is quoting
              right now. Nothing here reaches a real exchange, and nothing you
              lose is real money.
            </p>

            <div
              className="animate-rise mt-8 flex flex-wrap gap-3"
              style={{ animationDelay: "220ms" }}
            >
              <Link
                href="/market"
                className="press rounded-md bg-ink px-6 py-3 font-medium text-ink-inverse hover:opacity-90"
              >
                Open the market
              </Link>
              <Link
                href="/market/bitcoin"
                className="press rounded-md border border-line-strong px-6 py-3 font-medium text-ink-body hover:bg-surface-raised"
              >
                Trade Bitcoin
              </Link>
            </div>
          </div>

          {/* The chart is the product, so it opens the page instead of a
              screenshot of the product. */}
          {series ? (
            <HeroChart initial={series} />
          ) : (
            <div className="rounded-xl border border-line bg-surface-sunken p-10 text-center">
              <p className="font-medium">The price feed is not responding</p>
              <p className="mt-1 text-sm text-ink-muted">
                Charts return as soon as it does.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------- Market figures */}
      {stats && (
        <section className="border-b border-line">
          <div className="shell">
            <StatsBand stats={stats} />
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- Market */}
      <section className="border-b border-line">
        <div className="shell py-14 md:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.02em]">
                Top coins by market cap
              </h2>
              <p className="mt-2 text-ink-muted">
                Prices refresh every minute. Open any coin for its full chart.
              </p>
            </div>
            <Link
              href="/market"
              className="press text-sm px-4 py-2 rounded-md border border-line-strong text-ink-body hover:bg-surface-raised"
            >
              All 250 coins
            </Link>
          </div>

          <TopCoins coins={coins} />
        </div>
      </section>

      {/* -------------------------------------------------------------- Movers */}
      {(movers.gainers.length > 0 || movers.losers.length > 0) && (
        <section className="border-b border-line bg-surface-sunken">
          <div className="shell py-14 md:py-20">
            <div className="mb-8 max-w-[62ch]">
              <h2 className="text-3xl font-semibold tracking-[-0.02em]">
                Today&rsquo;s biggest moves
              </h2>
              <p className="mt-2 text-ink-muted">
                Measured over the last 24 hours, within the hundred largest
                coins. Smaller caps are left out because a thin market can
                double on almost no volume.
              </p>
            </div>

            <Movers gainers={movers.gainers} losers={movers.losers} />
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- How it works */}
      <section className="border-b border-line">
        <div className="shell py-14 md:py-20">
          <h2 className="text-3xl font-semibold tracking-[-0.02em]">How it works</h2>

          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
            {STEPS.map((step) => (
              <li key={step.title} className="border-t-2 border-ink pt-5">
                <div
                  className="font-mono text-2xl font-medium tracking-tight"
                  data-numeric
                >
                  {step.value}
                </div>
                <h3 className="mt-4 text-lg font-medium">{step.title}</h3>
                <p className="mt-2 text-ink-muted leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>

          <p className="mt-8 text-sm text-ink-muted">
            Figures above are an illustration of the flow, not a past result.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------- Honesty */}
      <section className="border-b border-line bg-surface-sunken">
        <div className="shell grid gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-20">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em]">
              What works today
            </h2>
            <p className="mt-3 max-w-[42ch] text-ink-muted">
              Real prices, fake money, and a short list of things a real
              exchange does that this one does not.
            </p>
            <p className="mt-6 max-w-[42ch] text-sm leading-relaxed text-ink-muted">
              Orders are simulated end to end. They fill at the price the
              server reads from the market at that moment, and the result is
              written to your account, but nothing reaches a real exchange.{" "}
              <Link href="/how-it-works" className="underline underline-offset-4">
                The full account of what is and is not simulated.
              </Link>
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 sm:gap-16">
            <div>
              <h3 className="text-sm font-medium text-ink">Working now</h3>
              <ul className="mt-4 space-y-3">
                {LIVE_NOW.map((item) => (
                  <li key={item} className="flex gap-3 text-ink-body">
                    <span
                      aria-hidden="true"
                      className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-up"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-ink">Not simulated</h3>
              <ul className="mt-4 space-y-3">
                {NOT_YET.map((item) => (
                  <li key={item} className="flex gap-3 text-ink-muted">
                    <span
                      aria-hidden="true"
                      className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CallToAction />
      <Footer />
    </div>
  );
}
