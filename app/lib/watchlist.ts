import { prisma } from "./prisma";
import { lookupCoin, getMarkets } from "./market";

export type WatchRow = {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  price: number | null;
  change: number | null;
  marketCap: number | null;
  addedAt: string;
};

export type WatchFailure = "UNKNOWN_COIN" | "NO_PRICE" | "LIST_FULL";

export type WatchResult =
  | { ok: true; coinId: string; symbol: string; watching: boolean }
  | { ok: false; code: WatchFailure; message: string };

/** Every entry is re-priced on each read, so the list has to stay small
 *  enough that the page does not turn into a market scan. */
const MAX_ENTRIES = 50;

/**
 * Follow a coin.
 *
 * Keyed by CoinGecko id rather than ticker: symbols collide across coins and
 * get reused, so a watchlist keyed on "BTC" would quietly start pointing at
 * something else.
 */
export async function addToWatchlist(userId: number, rawCoinId: string): Promise<WatchResult> {
  const coinId = rawCoinId.trim().toLowerCase();
  if (!coinId) {
    return { ok: false, code: "UNKNOWN_COIN", message: "That coin is not listed." };
  }

  const lookup = await lookupCoin(coinId);
  if (lookup.status === "not_found") {
    return { ok: false, code: "UNKNOWN_COIN", message: "That coin is not listed." };
  }
  if (lookup.status === "unavailable") {
    return {
      ok: false,
      code: "NO_PRICE",
      message: "The price feed is not responding. Try again shortly.",
    };
  }

  const symbol = lookup.coin.symbol.toUpperCase();

  const count = await prisma.watchlist.count({ where: { userId } });
  const already = await prisma.watchlist.findUnique({
    where: { userId_coinId: { userId, coinId } },
    select: { id: true },
  });

  if (!already && count >= MAX_ENTRIES) {
    return {
      ok: false,
      code: "LIST_FULL",
      message: `Your watchlist holds ${MAX_ENTRIES} coins. Remove one first.`,
    };
  }

  // upsert, not create: two tabs clicking the star at once would otherwise
  // race into the unique constraint.
  await prisma.watchlist.upsert({
    where: { userId_coinId: { userId, coinId } },
    create: { userId, coinId, symbol },
    update: { symbol },
  });

  return { ok: true, coinId, symbol, watching: true };
}

export async function removeFromWatchlist(
  userId: number,
  rawCoinId: string,
): Promise<WatchResult> {
  const coinId = rawCoinId.trim().toLowerCase();

  // deleteMany, not delete: removing something already gone is the outcome
  // the caller asked for, not an error.
  await prisma.watchlist.deleteMany({ where: { userId, coinId } });

  return { ok: true, coinId, symbol: "", watching: false };
}

/** The coin ids a user follows, for marking stars on a list of coins. */
export async function getWatchedIds(userId: number): Promise<Set<string>> {
  const rows = await prisma.watchlist.findMany({
    where: { userId },
    select: { coinId: true },
  });
  return new Set(rows.map((row) => row.coinId));
}

/**
 * The watchlist with live prices attached.
 *
 * Coins inside the cached top 250 cost nothing extra. Anything below that is
 * left unpriced rather than fanned out into one upstream call per row, which
 * is what would get the whole page rate-limited.
 */
export async function getWatchlist(userId: number): Promise<WatchRow[]> {
  const [rows, markets] = await Promise.all([
    prisma.watchlist.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    getMarkets(),
  ]);

  const byId = new Map(markets.map((coin) => [coin.id, coin]));

  return rows.map((row) => {
    const coin = byId.get(row.coinId);
    return {
      coinId: row.coinId,
      symbol: coin?.symbol.toUpperCase() ?? row.symbol,
      name: coin?.name ?? row.coinId.replace(/-/g, " "),
      image: coin?.image ?? "",
      price: coin?.price ?? null,
      change: coin?.change ?? null,
      marketCap: coin?.marketCap ?? null,
      addedAt: row.createdAt.toISOString(),
    };
  });
}
