import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "../components/PageShell";
import { formatUsd } from "../lib/format";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "What TokenX simulates, what it does not, and where every number on the site comes from.",
};

const SECTIONS = [
  {
    heading: "The balance",
    body: [
      `Every account opens with ${formatUsd(5000)}. There is no card, no deposit and no way to add more: the starting figure is the same for everyone, which is what makes the leaderboard mean anything.`,
      "It is a number in a Postgres column. It is not money, it cannot be withdrawn, and nothing on this site reaches a real exchange.",
    ],
  },
  {
    heading: "The prices",
    body: [
      "Prices and 24h figures come from CoinGecko. Candles come from Binance. Both are the real public feeds, so what you see is what the market is quoting.",
      "They are cached on the server for between fifteen and sixty seconds depending on the figure, so every visitor reading the same page costs one upstream request rather than one each. A price can therefore be up to a minute stale, and a fill uses the price the server reads at the moment it fills, not the one your screen was showing.",
    ],
  },
  {
    heading: "Market orders",
    body: [
      "A market order fills straight away at the price the server looks up when it receives your order. The browser never sends a price; if it did, anyone could buy at a price of their choosing.",
      "The cash and the tokens move in one database transaction with the balance check inside the same statement as the debit, so two orders sent at the same moment cannot both spend money only one of them has.",
      "An order worth less than a cent is refused, and a buy is never charged less than one. Cash rounds to cents, so below that an order would cost nothing and still hand over tokens.",
    ],
  },
  {
    heading: "Limit orders",
    body: [
      "A limit order rests until the market reaches your price. A buy fills at or below its limit, a sell at or above it.",
      "The cash for a buy, or the tokens for a sell, leave your available balance the moment the order is placed and are held against that order. Cancelling returns them in full. Filling below your limit returns the difference, so a buy never costs more than it reserved.",
      "Resting orders are re-priced whenever you open your orders list or your dashboard, which is the moment a fill actually happens for you. There is also a scheduled runner for orders belonging to people who are not currently looking.",
    ],
  },
  {
    heading: "Profit and loss",
    body: [
      "Positions are valued at the live price every time a page is read. Average cost is replayed from your trade log using the moving-average method, because a holding stores a quantity and not a history.",
      "Unrealised profit is what a position is worth now against what it cost. Nothing is stored as a snapshot: a saved figure would be wrong the moment the market moved.",
    ],
  },
  {
    heading: "The games",
    body: [
      "Three side games share the same balance. Rolls and flips are generated on the server with a cryptographic random source after the stake has been taken.",
      "Each pays true odds less one percent, and that percent is already in the multiplier each panel shows. It is small enough to look like noise and large enough that playing long enough has one ending.",
    ],
  },
];

const NOT_SIMULATED = [
  "Spreads, slippage and order book depth: a fill uses one mid price",
  "Fees and funding, which a real exchange charges on both sides",
  "Partial fills: an order fills whole or not at all",
  "Leverage, margin, liquidation and anything that can take you below zero",
  "Taxes, withdrawal limits and anything about moving real money",
];

export default function HowItWorksPage() {
  return (
    <PageShell>
      {/* Prose does not want the full page width, so this one page sits in a
          narrower column of its own inside the shell. */}
      <div className="mx-auto max-w-[1080px]">
      <header className="max-w-[62ch]">
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">How it works</h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-body">
          TokenX is a trading simulator with real prices and fake money. This
          page says exactly what that means, including the parts it does not
          simulate.
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="On this page" className="lg:sticky lg:top-8 lg:self-start">
          <ul className="space-y-2 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.heading}>
                <a
                  href={`#${slug(section.heading)}`}
                  className="text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                >
                  {section.heading}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#not-simulated"
                className="text-ink-muted underline-offset-4 hover:text-ink hover:underline"
              >
                What it does not simulate
              </a>
            </li>
          </ul>
        </nav>

        <div className="max-w-[66ch]">
          {SECTIONS.map((section) => (
            <section key={section.heading} id={slug(section.heading)} className="mb-12 scroll-mt-8">
              <h2 className="border-t-2 border-ink pt-4 text-xl font-semibold">
                {section.heading}
              </h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-4 leading-relaxed text-ink-body">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <section id="not-simulated" className="mb-12 scroll-mt-8">
            <h2 className="border-t-2 border-ink pt-4 text-xl font-semibold">
              What it does not simulate
            </h2>
            <p className="mt-4 leading-relaxed text-ink-body">
              A simulator that quietly left these out while feeling realistic
              would teach the wrong lesson, so they are listed instead.
            </p>
            <ul className="mt-5 space-y-3">
              {NOT_SIMULATED.map((item) => (
                <li key={item} className="flex gap-3 text-ink-body">
                  <span
                    aria-hidden="true"
                    className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap gap-3 border-t border-line pt-8">
            <Link
              href="/market"
              className="press rounded-md bg-ink px-6 py-3 font-medium text-ink-inverse hover:opacity-90"
            >
              Open the market
            </Link>
            <Link
              href="/dashboard"
              className="press rounded-md border border-line-strong px-6 py-3 font-medium text-ink-body hover:bg-surface-raised"
            >
              Your dashboard
            </Link>
          </div>
        </div>
      </div>
      </div>
    </PageShell>
  );
}

function slug(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
