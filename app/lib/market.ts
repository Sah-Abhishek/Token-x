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

/** 24h ticker for the given Binance symbols, e.g. ["BTCUSDT", "ETHUSDT"]. */
export async function getTickers(symbols: string[]): Promise<Ticker[]> {
  if (symbols.length === 0) return [];

  try {
    const query = encodeURIComponent(JSON.stringify(symbols));
    const res = await fetch(`${BINANCE}/ticker/24hr?symbols=${query}`, {
      next: { revalidate: TICKER_TTL },
    });

    if (!res.ok) {
      console.error(`Binance /ticker/24hr failed: ${res.status}`);
      return [];
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];

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
  } catch (error) {
    console.error("Failed to fetch tickers:", error);
    return [];
  }
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

/** Close-price series for a Binance pair over one of the CHART_RANGES. */
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

    if (!res.ok) return null;

    const raw: unknown = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const points: PricePoint[] = (raw as [number, string, string, string, string][])
      .map(([t, , , , close]) => ({ t, c: parseFloat(close) }))
      .filter((p) => Number.isFinite(p.c));

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
  } catch (error) {
    console.error(`Failed to fetch series for ${pair}:`, error);
    return null;
  }
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

/** Downsample to at most `target` evenly spaced points. A 168-point sparkline
 *  renders at ~80px wide, so most of those points land on the same pixel. */
function thin(values: number[], target: number): number[] {
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
