import { Prisma } from "@/app/generated/prisma";
import { prisma } from "./prisma";
import { getMarkets } from "./market";

export type Position = {
  symbol: string;
  amount: number;
  /** Weighted-average purchase price, in USD. */
  avgCost: number;
  price: number;
  value: number;
  /** Unrealised gain or loss in USD. */
  pnl: number;
  /** Unrealised gain or loss as a percentage of cost. */
  pnlPct: number;
  /** False when no live price could be matched to the symbol. */
  priced: boolean;
};

export type Portfolio = {
  balanceUSD: number;
  positions: Position[];
  holdingsValue: number;
  totalValue: number;
  totalPnl: number;
  /** Starting balance every account is created with. */
  startingBalance: number;
  /** Total return against the starting balance. */
  totalReturnPct: number;
};

export type TradeRow = {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  amount: number;
  pricePerToken: number;
  total: number;
  createdAt: string;
};

const STARTING_BALANCE = 5000;

/**
 * Weighted-average cost basis, replayed from the trade log.
 *
 * The Holding table stores only a quantity, so the cost basis has to come
 * from the trades that produced it. A sale reduces cost proportionally and
 * leaves the average untouched, which is the standard moving-average method.
 */
function costBasisBySymbol(
  trades: { symbol: string; type: string; amount: Prisma.Decimal; total: Prisma.Decimal }[],
): Map<string, { qty: number; cost: number }> {
  const books = new Map<string, { qty: number; cost: number }>();

  for (const trade of trades) {
    const book = books.get(trade.symbol) ?? { qty: 0, cost: 0 };
    const amount = trade.amount.toNumber();
    const total = trade.total.toNumber();

    if (trade.type === "BUY") {
      book.qty += amount;
      book.cost += total;
    } else {
      const unitCost = book.qty > 0 ? book.cost / book.qty : 0;
      book.cost = Math.max(0, book.cost - unitCost * amount);
      book.qty = Math.max(0, book.qty - amount);
    }

    books.set(trade.symbol, book);
  }

  return books;
}

/** Highest-market-cap coin per symbol. Symbols are not unique across
 *  CoinGecko, so the largest listing is the sane default. */
async function priceBySymbol(): Promise<Map<string, number>> {
  const markets = await getMarkets();
  const prices = new Map<string, number>();

  // getMarkets returns market-cap descending, so the first win stands.
  for (const coin of markets) {
    const symbol = coin.symbol.toUpperCase();
    if (!prices.has(symbol)) prices.set(symbol, coin.price);
  }

  return prices;
}

export async function getPortfolio(userId: number): Promise<Portfolio> {
  const [user, holdings, trades, prices] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { balanceUSD: true },
    }),
    prisma.holding.findMany({
      where: { userId, amount: { gt: 0 } },
      orderBy: { symbol: "asc" },
    }),
    prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { symbol: true, type: true, amount: true, total: true },
    }),
    priceBySymbol(),
  ]);

  const books = costBasisBySymbol(trades);
  const balanceUSD = user.balanceUSD.toNumber();

  const positions: Position[] = holdings.map((holding) => {
    const amount = holding.amount.toNumber();
    const book = books.get(holding.symbol);
    const avgCost = book && book.qty > 0 ? book.cost / book.qty : 0;

    const livePrice = prices.get(holding.symbol);
    const priced = typeof livePrice === "number" && livePrice > 0;
    const price = priced ? livePrice : avgCost;

    const value = amount * price;
    const cost = amount * avgCost;
    const pnl = value - cost;

    return {
      symbol: holding.symbol,
      amount,
      avgCost,
      price,
      value,
      pnl,
      pnlPct: cost > 0 ? (pnl / cost) * 100 : 0,
      priced,
    };
  });

  const holdingsValue = positions.reduce((sum, p) => sum + p.value, 0);
  const totalValue = balanceUSD + holdingsValue;

  return {
    balanceUSD,
    positions,
    holdingsValue,
    totalValue,
    totalPnl: positions.reduce((sum, p) => sum + p.pnl, 0),
    startingBalance: STARTING_BALANCE,
    totalReturnPct: ((totalValue - STARTING_BALANCE) / STARTING_BALANCE) * 100,
  };
}

export async function getRecentTrades(userId: number, take = 20): Promise<TradeRow[]> {
  const trades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });

  return trades.map((trade) => ({
    id: trade.id,
    symbol: trade.symbol,
    type: trade.type as "BUY" | "SELL",
    amount: trade.amount.toNumber(),
    pricePerToken: trade.pricePerToken.toNumber(),
    total: trade.total.toNumber(),
    createdAt: trade.createdAt.toISOString(),
  }));
}
