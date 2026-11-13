/**
 * Single source of truth for market data.
 *
 * Both the route handlers and the server components import from here, so the
 * app never makes an HTTP call to its own API (which previously required an
 * API_URL env var and broke silently in production when it was unset).
 *
 * Every outbound fetch sets `next.revalidate`, so Next's data cache collapses
 * all concurrent visitors into at most one upstream call per window. This is
 * what keeps the free CoinGecko tier from returning 429s under any traffic.
 */

const COINGECKO = "https://api.coingecko.com/api/v3";
const BINANCE = "https://api.binance.com/api/v3";

/** Seconds. Market tables tolerate a minute of staleness; tickers less. */
const MARKETS_TTL = 60;
const COIN_TTL = 30;
const TICKER_TTL = 15;

export type Crypto = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  /** 24h change as a percentage, e.g. -3.42 */
  change: number;
  /** Raw USD market capitalisation. Format at the display layer. */
  marketCap: number;
  /** Raw USD 24h volume. Format at the display layer. */
  volume: number;
  /** Session extremes. Null when the feed omits them; never substitute the
   *  current price, which would draw a zero-width day range. */
  high24h: number | null;
  low24h: number | null;
  image: string;
};

export type CoinDetail = Crypto & {
  circulatingSupply: number;
};

export type Ticker = {
  symbol: string;
  price: number;
  change: number;
  isPositive: boolean;
};

type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  price_change_percentage_24h: number | null;
  market_cap: number | null;
  total_volume: number | null;
  circulating_supply: number | null;
  high_24h: number | null;
  low_24h: number | null;
};

const num = (value: number | null | undefined): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

function toCrypto(coin: CoinGeckoMarket): Crypto {
  return {
    id: coin.id,
    symbol: coin.symbol ?? "",
    name: coin.name ?? "",
    price: num(coin.current_price),
    change: num(coin.price_change_percentage_24h),
    marketCap: num(coin.market_cap),
    volume: num(coin.total_volume),
    high24h: coin.high_24h ?? null,
    low24h: coin.low_24h ?? null,
    image: coin.image ?? "",
  };
}

/** Top coins by market cap. Returns [] rather than throwing, so a CoinGecko
 *  outage degrades to an empty table instead of a 500 page. */
export async function getMarkets(perPage = 250): Promise<Crypto[]> {
  try {
    const res = await fetch(
      `${COINGECKO}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=false`,
      { next: { revalidate: MARKETS_TTL } },
    );

    if (!res.ok) {
      console.error(`CoinGecko /coins/markets failed: ${res.status}`);
      return [];
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];

    return (data as CoinGeckoMarket[]).map(toCrypto);
  } catch (error) {
    console.error("Failed to fetch markets:", error);
    return [];
  }
}

/**
 * A coin lookup distinguishes "this id does not exist" from "the price feed
 * did not answer". Collapsing both into null told anyone who placed an order
 * during a CoinGecko rate-limit that their coin was not listed.
 */
export type CoinLookup =
  | { status: "ok"; coin: CoinDetail }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function lookupCoin(id: string): Promise<CoinLookup> {
  const coinId = id.trim().toLowerCase().replace(/\s+/g, "-");
  if (!coinId) return { status: "not_found" };

  try {
    const res = await fetch(
      `${COINGECKO}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinId)}`,
      { next: { revalidate: COIN_TTL } },
    );

    if (!res.ok) {
      // 429 and 5xx mean the feed is unhappy, not that the coin is unknown.
      console.error(`CoinGecko /coins/markets?ids failed: ${res.status}`);
      return { status: "unavailable" };
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return { status: "unavailable" };
    if (data.length === 0) return { status: "not_found" };

    const coin = data[0] as CoinGeckoMarket;
    return {
      status: "ok",
      coin: {
        ...toCrypto(coin),
        circulatingSupply: num(coin.circulating_supply),
      },
    };
  } catch (error) {
    console.error(`Failed to fetch coin "${coinId}":`, error);
    return { status: "unavailable" };
  }
}

/** Convenience wrapper for callers that treat both failures the same. */
export async function getCoin(id: string): Promise<CoinDetail | null> {
  const result = await lookupCoin(id);
  return result.status === "ok" ? result.coin : null;
}

/**
 * 24h ticker for the given Binance symbols, e.g. ["BTCUSDT", "ETHUSDT"].
 *
 * Falls back to the cached market list, which already carries a price and a
 * 24h change for every top-250 coin. The fallback therefore costs no extra
 * upstream request at all — it reads the same cached response the rest of the
 * page is already built from.
 */
export async function getTickers(symbols: string[]): Promise<Ticker[]> {
  if (symbols.length === 0) return [];

  try {
    const query = encodeURIComponent(JSON.stringify(symbols));
    const res = await fetch(`${BINANCE}/ticker/24hr?symbols=${query}`, {
      next: { revalidate: TICKER_TTL },
    });

    if (res.ok) {
      const data: unknown = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        return (data as { symbol: string; lastPrice: string; priceChangePercent: string }[]).map(
          (entry) => {
            const change = parseFloat(entry.priceChangePercent);
            return {
              symbol: entry.symbol.replace(/USDT$/, ""),
              price: parseFloat(entry.lastPrice) || 0,
              change: Number.isFinite(change) ? change : 0,
              isPositive: Number.isFinite(change) ? change >= 0 : true,
            };
          },
        );
      }
    } else {
      console.error(`Binance /ticker/24hr failed: ${res.status}`);
    }
  } catch (error) {
    console.error("Binance /ticker/24hr threw:", error);
  }

  return tickersFromMarkets(symbols);
}

/** Tickers assembled from the cached CoinGecko market list. */
async function tickersFromMarkets(symbols: string[]): Promise<Ticker[]> {
  const markets = await getMarkets();
  if (markets.length === 0) return [];

  // Largest market cap wins a contested ticker, as everywhere else.
  const bySymbol = new Map<string, Crypto>();
  for (const coin of markets) {
    const key = coin.symbol.toUpperCase();
    const held = bySymbol.get(key);
    if (!held || coin.marketCap > held.marketCap) bySymbol.set(key, coin);
  }

  const tickers: Ticker[] = [];
  for (const requested of symbols) {
    const ticker = requested.trim().toUpperCase().replace(/USDT$/, "");
    const coin = bySymbol.get(ticker);
    if (!coin) continue;

    tickers.push({
      symbol: ticker,
      price: coin.price,
      change: coin.change,
      isPositive: coin.change >= 0,
    });
  }

  return tickers;
}

/* ---------------------------------------------------------------------------
 * Chart series
 * ------------------------------------------------------------------------- */

/** The ranges offered on the landing-page chart. Product-level windows rather
 *  than raw exchange intervals, so the labels mean something to a reader. */
export const CHART_RANGES = {
  "24H": { interval: "15m", limit: 96 },
  "7D": { interval: "1h", limit: 168 },
  "30D": { interval: "4h", limit: 180 },
  "1Y": { interval: "1w", limit: 52 },
} as const;

export type ChartRange = keyof typeof CHART_RANGES;

export type PricePoint = {
  /** Unix milliseconds. */
  t: number;
  /** Close price in USD. */
  c: number;
};

export type Series = {
  pair: string;
  range: ChartRange;
  points: PricePoint[];
  first: number;
  last: number;
  min: number;
  max: number;
  /** Percentage change across the whole window. */
  change: number;
};

const SERIES_TTL = 60;

/**
 * CoinGecko picks its own granularity from the day span: five-minutely for a
 * single day, hourly out to ninety, daily beyond that. These spans land close
 * enough to the Binance intervals that the fallback chart looks like the one
 * it replaces.
 */
const COINGECKO_RANGE_DAYS: Record<ChartRange, number> = {
  "24H": 1,
  "7D": 7,
  "30D": 30,
  "1Y": 365,
};

/** The derived figures every series carries, computed in one place so the two
 *  sources cannot disagree about what "change" means. */
function buildSeries(pair: string, range: ChartRange, points: PricePoint[]): Series | null {
  if (points.length < 2) return null;

  const closes = points.map((p) => p.c);
  const first = closes[0];
  const last = closes[closes.length - 1];

  return {
    pair,
    range,
    points,
    first,
    last,
    min: Math.min(...closes),
    max: Math.max(...closes),
    change: first === 0 ? 0 : ((last - first) / first) * 100,
  };
}

/**
 * The handful of ids worth hard-coding.
 *
 * Resolving a ticker normally means reading the market list, which puts the
 * chart behind a second rate-limited request. These are the coins the chart
 * is actually asked for, and their ids have never changed, so the common path
 * needs no lookup at all.
 */
const WELL_KNOWN_COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  BNB: "binancecoin",
  ADA: "cardano",
  DOGE: "dogecoin",
};

/**
 * CoinGecko addresses coins by id, never by ticker.
 *
 * The cached market list is the lookup table, and the largest coin wins a
 * contested ticker — the same rule the leaderboard uses, because tickers are
 * reused freely by unrelated coins.
 */
async function coinIdForSymbol(ticker: string): Promise<string | null> {
  const known = WELL_KNOWN_COIN_IDS[ticker];
  if (known) return known;

  const markets = await getMarkets();

  let best: Crypto | null = null;
  for (const coin of markets) {
    if (coin.symbol.toUpperCase() !== ticker) continue;
    if (!best || coin.marketCap > best.marketCap) best = coin;
  }

  return best?.id ?? null;
}

/** Close-price series from CoinGecko, for when Binance will not answer. */
async function seriesFromCoinGecko(
  ticker: string,
  pair: string,
  range: ChartRange,
): Promise<Series | null> {
  const id = await coinIdForSymbol(ticker);
  if (!id) return null;

  try {
    const res = await fetch(
      `${COINGECKO}/coins/${id}/market_chart?vs_currency=usd&days=${COINGECKO_RANGE_DAYS[range]}`,
      { next: { revalidate: SERIES_TTL } },
    );

    if (!res.ok) {
      console.error(`CoinGecko market_chart failed for ${id}: ${res.status}`);
      return null;
    }

    const raw: unknown = await res.json();
    const prices = (raw as { prices?: unknown }).prices;
    if (!Array.isArray(prices)) return null;

    const points: PricePoint[] = (prices as [number, number][])
      .map(([t, c]) => ({ t, c }))
      .filter((point) => Number.isFinite(point.c) && Number.isFinite(point.t));

    // A thirty-day span comes back hourly, which is 720 points for a chart
    // that is drawn 180 wide. Match the Binance budget for the same range.
    return buildSeries(pair, range, thin(points, CHART_RANGES[range].limit));
  } catch (error) {
    console.error(`CoinGecko market_chart threw for ${id}:`, error);
    return null;
  }
}

/**
 * Close-price series over one of the CHART_RANGES.
 *
 * Binance is the preferred source: its intervals are exact and its history is
 * free of the free tier's rate limit. It is also unreachable from half the
 * places this app can be deployed — it answers 451 Unavailable For Legal
 * Reasons to any request that looks like it comes from the US, which includes
 * every Vercel function in `iad1`. So a failure here is routine rather than
 * exceptional, and falling back to CoinGecko is the difference between a
 * chart and an apology.
 */
export async function getSeries(symbol: string, range: ChartRange): Promise<Series | null> {
  const ticker = symbol.trim().toUpperCase();
  if (!ticker) return null;

  const pair = `${ticker}USDT`;
  const { interval, limit } = CHART_RANGES[range];

  try {
    const res = await fetch(
      `${BINANCE}/klines?symbol=${pair}&interval=${interval}&limit=${limit}`,
      { next: { revalidate: SERIES_TTL } },
    );

    if (res.ok) {
      const raw: unknown = await res.json();

      if (Array.isArray(raw) && raw.length > 0) {
        const points: PricePoint[] = (raw as [number, string, string, string, string][])
          .map(([t, , , , close]) => ({ t, c: parseFloat(close) }))
          .filter((point) => Number.isFinite(point.c));

        const series = buildSeries(pair, range, points);
        if (series) return series;
      }
    } else {
      console.error(`Binance /klines failed for ${pair}: ${res.status}`);
    }
  } catch (error) {
    console.error(`Binance /klines threw for ${pair}:`, error);
  }

  return seriesFromCoinGecko(ticker, pair, range);
}

/* ---------------------------------------------------------------------------
 * Coins with 7d sparkline data
 * ------------------------------------------------------------------------- */

export type CryptoWithSparkline = Crypto & {
  /** 7d hourly close prices, thinned for rendering. */
  sparkline: number[];
};

type CoinGeckoMarketWithSparkline = CoinGeckoMarket & {
  sparkline_in_7d?: { price?: number[] };
};

/** Downsample to at most `target` evenly spaced items. A 168-point sparkline
 *  renders at ~80px wide, so most of those points land on the same pixel. */
function thin<T>(values: T[], target: number): T[] {
  if (values.length <= target) return values;
  const step = (values.length - 1) / (target - 1);
  return Array.from({ length: target }, (_, i) => values[Math.round(i * step)]);
}

/** Top coins by market cap, each with a 7d sparkline. */
export async function getTopCoinsWithSparkline(count = 6): Promise<CryptoWithSparkline[]> {
  try {
    const res = await fetch(
      `${COINGECKO}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${count}&page=1&sparkline=true`,
      { next: { revalidate: MARKETS_TTL } },
    );

    if (!res.ok) {
      console.error(`CoinGecko sparkline markets failed: ${res.status}`);
      return [];
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];

    return (data as CoinGeckoMarketWithSparkline[]).map((coin) => ({
      ...toCrypto(coin),
      sparkline: thin(
        (coin.sparkline_in_7d?.price ?? []).filter((n) => Number.isFinite(n)),
        48,
      ),
    }));
  } catch (error) {
    console.error("Failed to fetch sparkline markets:", error);
    return [];
  }
}

/* ---------------------------------------------------------------------------
 * Whole-market figures
 * ------------------------------------------------------------------------- */

export type GlobalStats = {
  marketCap: number;
  volume24h: number;
  /** Bitcoin's share of total market cap, as a percentage. */
  btcDominance: number;
  activeCoins: number;
  /** Change in total market cap over 24h, as a percentage. */
  marketCapChange24h: number;
};

export async function getGlobalStats(): Promise<GlobalStats | null> {
  try {
    const res = await fetch(`${COINGECKO}/global`, {
      next: { revalidate: MARKETS_TTL },
    });

    if (!res.ok) {
      console.error(`CoinGecko /global failed: ${res.status}`);
      return null;
    }

    const body = (await res.json()) as {
      data?: {
        active_cryptocurrencies?: number;
        total_market_cap?: { usd?: number };
        total_volume?: { usd?: number };
        market_cap_percentage?: { btc?: number };
        market_cap_change_percentage_24h_usd?: number;
      };
    };

    const data = body.data;
    if (!data) return null;

    return {
      marketCap: num(data.total_market_cap?.usd),
      volume24h: num(data.total_volume?.usd),
      btcDominance: num(data.market_cap_percentage?.btc),
      activeCoins: num(data.active_cryptocurrencies),
      marketCapChange24h: num(data.market_cap_change_percentage_24h_usd),
    };
  } catch (error) {
    console.error("Failed to fetch global stats:", error);
    return null;
  }
}

/**
 * Biggest 24h movers within the top coins by market cap.
 *
 * The universe is capped so the list is not dominated by micro-caps that
 * doubled on no volume, which is what makes most "top gainers" tables useless.
 */
export async function getMovers(
  universe = 100,
  count = 5,
): Promise<{ gainers: Crypto[]; losers: Crypto[] }> {
  const markets = await getMarkets();
  if (markets.length === 0) return { gainers: [], losers: [] };

  const pool = markets
    .slice(0, universe)
    // Stablecoins hold their peg by design, so they only add noise here.
    .filter((coin) => Math.abs(coin.change) > 0.01);

  const byChange = [...pool].sort((a, b) => b.change - a.change);

  return {
    gainers: byChange.slice(0, count),
    losers: byChange.slice(-count).reverse(),
  };
}
