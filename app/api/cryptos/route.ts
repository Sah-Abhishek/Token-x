import { NextResponse } from "next/server";
import { getMarkets } from "@/app/lib/market";

/**
 * Top coins by market cap.
 *
 * Returns raw numbers. The previous version returned pre-formatted strings
 * ("$2000.0B", "1.23%") which the market page then regex-parsed back into
 * numbers — a lossy round trip that corrupted market caps above $1T and made
 * the table sort on the degraded values.
 */
export async function GET() {
  const cryptocurrencies = await getMarkets();

  if (cryptocurrencies.length === 0) {
    return NextResponse.json(
      { error: "Market data is temporarily unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json(cryptocurrencies, {
    status: 200,
    headers: {
      // Serve from the edge cache for a minute, and keep serving the stale
      // copy for an hour while revalidating, so a CoinGecko blip is invisible.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600",
    },
  });
}
