import { prisma } from "./prisma";
import { getMarkets } from "./market";

export type LeaderRow = {
  rank: number;
  userId: number;
  username: string;
  name: string;
  balanceUSD: number;
  holdingsValue: number;
  totalValue: number;
  /** Return against the starting balance, as a percentage. */
  returnPct: number;
  positions: number;
  trades: number;
  /** True for the row belonging to the person reading the page. */
  isYou: boolean;
};

export type Leaderboard = {
  rows: LeaderRow[];
  /** The reader's own row, included even when they rank below the cut. */
  you: LeaderRow | null;
  /** How many accounts were ranked, which is what a rank is out of. */
  total: number;
  /** False when no live prices were available, so holdings are valued at
   *  zero and the ranking would be misleading. */
  priced: boolean;
};

export const STARTING_BALANCE = 5000;

/** The ranking is computed in one pass over every account, so it has to stay
 *  bounded. Beyond this the whole approach needs a stored equity column. */
const MAX_ACCOUNTS = 1000;

const VISIBLE = 50;

/**
 * Rank accounts by total equity: cash plus holdings at live prices.
 *
 * Equity is recomputed on every read rather than stored. A stored figure
 * would be wrong the moment the market moved, and the alternative — writing
 * a snapshot on every price tick — is a scheduler this app does not have.
 */
export async function getLeaderboard(viewerId?: number): Promise<Leaderboard> {
  const [users, markets] = await Promise.all([
    prisma.user.findMany({
      take: MAX_ACCOUNTS,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        username: true,
        name: true,
        balanceUSD: true,
        holdings: { where: { amount: { gt: 0 } }, select: { symbol: true, amount: true } },
        _count: { select: { trades: true } },
      },
    }),
    getMarkets(),
  ]);

  // Symbols are not unique across CoinGecko, so the highest-market-cap
  // listing wins. getMarkets is market-cap descending, so the first wins.
  const prices = new Map<string, number>();
  for (const coin of markets) {
    const symbol = coin.symbol.toUpperCase();
    if (!prices.has(symbol)) prices.set(symbol, coin.price);
  }

  const scored = users.map((user) => {
    const balanceUSD = user.balanceUSD.toNumber();

    const holdingsValue = user.holdings.reduce((sum, holding) => {
      const price = prices.get(holding.symbol) ?? 0;
      return sum + holding.amount.toNumber() * price;
    }, 0);

    const totalValue = balanceUSD + holdingsValue;

    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      balanceUSD,
      holdingsValue,
      totalValue,
      returnPct: ((totalValue - STARTING_BALANCE) / STARTING_BALANCE) * 100,
      positions: user.holdings.length,
      trades: user._count.trades,
      isYou: user.id === viewerId,
    };
  });

  scored.sort((a, b) => b.totalValue - a.totalValue);

  const ranked: LeaderRow[] = scored.map((row, index) => ({ rank: index + 1, ...row }));
  const you = viewerId === undefined ? null : (ranked.find((row) => row.isYou) ?? null);

  return {
    rows: ranked.slice(0, VISIBLE),
    you,
    total: ranked.length,
    priced: markets.length > 0,
  };
}
