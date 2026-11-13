import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import PageShell from "../components/PageShell";
import GamesClient, { type GameRules } from "../components/games/GamesClient";
import type { PredictionCoin } from "../components/games/PredictionGame";
import { getCurrentDbUser, isDatabaseUnreachable } from "../lib/user";
import { getMarkets } from "../lib/market";
import {
  getBets,
  getGameStats,
  settleDuePredictions,
  COIN_MULTIPLIER,
  PREDICTION_MULTIPLIER,
  DICE_MIN_TARGET,
  DICE_MAX_TARGET,
  STAKE_MIN,
  STAKE_MAX,
  HOUSE_EDGE,
  type BetRow,
  type GameStats,
} from "../lib/games";
import { prisma } from "../lib/prisma";
import { formatUsd } from "../lib/format";

export const metadata: Metadata = {
  title: "Games",
  description: "Three side games played with the same virtual balance.",
};

export const dynamic = "force-dynamic";

const RULES: GameRules = {
  stakeMin: STAKE_MIN,
  stakeMax: STAKE_MAX,
  coinMultiplier: COIN_MULTIPLIER,
  predictionMultiplier: PREDICTION_MULTIPLIER,
  diceMinTarget: DICE_MIN_TARGET,
  diceMaxTarget: DICE_MAX_TARGET,
  houseEdge: HOUSE_EDGE,
};

export default async function GamesPage() {
  let balance: number;
  let bets: BetRow[];
  let stats: GameStats;
  let coins: PredictionCoin[];

  try {
    const user = await getCurrentDbUser();

    if (!user) {
      return (
        <PageShell>
          <Heading />
          <div className="mt-6 max-w-xl rounded-lg border border-line bg-surface-sunken p-6">
            <p className="font-medium">Sign in to play</p>
            <p className="mt-2 text-sm text-ink-muted">
              The games use the same virtual balance as the trading side, so
              they need an account. Every new one opens with {formatUsd(5000)}.
            </p>
            <SignInButton mode="modal">
              <button className="press mt-5 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-ink-inverse hover:opacity-90">
                Sign in
              </button>
            </SignInButton>
          </div>
          <Rules />
        </PageShell>
      );
    }

    // Anything whose window closed while the page was shut settles here,
    // before the history is read.
    await settleDuePredictions(user.id);

    const [row, betRows, statRows, markets] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { balanceUSD: true },
      }),
      getBets(user.id),
      getGameStats(user.id),
      getMarkets(),
    ]);

    balance = row.balanceUSD.toNumber();
    bets = betRows;
    stats = statRows;
    coins = markets.slice(0, 12).map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
    }));
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
      return (
        <PageShell>
          <Heading />
          <div className="mt-6 max-w-xl rounded-lg border border-line bg-surface-sunken p-6">
            <p className="font-medium">The database is not reachable</p>
            <p className="mt-2 text-sm text-ink-muted">
              A round moves your balance, so it has to be recorded. Market data
              and charts still work.
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
      <Heading />
      <GamesClient
        initialBalance={balance}
        initialBets={bets}
        initialStats={stats}
        coins={coins}
        rules={RULES}
      />
      <Rules />
    </PageShell>
  );
}

function Heading() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">Games</h1>
        <p className="mt-2 max-w-[60ch] text-ink-muted">
          Three side games played with the same virtual balance as the trading
          side. Nothing here is real money, and nothing here is a way to learn
          to trade.
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

function Rules() {
  return (
    <section className="mt-14 max-w-[70ch] border-t border-line pt-8">
      <h2 className="text-lg font-medium">How the odds work</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        Every game pays true odds less one percent, and that percent is already
        inside the multiplier shown on each panel. A coin flip has two
        outcomes, so true odds are {COIN_MULTIPLIER + 0.02}x and it pays{" "}
        {COIN_MULTIPLIER}x. Dice pays 100 divided by the number of winning
        faces, less the same one percent. A price prediction pays{" "}
        {PREDICTION_MULTIPLIER}x, which is lower because a window can also
        close at exactly the entry price, and that returns the stake rather
        than losing it.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        Rolls and flips are generated on the server with a cryptographic
        random source after the stake has been taken, and prices for a
        prediction are read on the server at both ends. Nothing the browser
        sends decides an outcome.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        One percent against you on every round is small enough to look like
        noise and large enough that playing long enough has exactly one
        ending. That is the honest thing a simulator can show you about this
        kind of game, which is why it is here.
      </p>
    </section>
  );
}
