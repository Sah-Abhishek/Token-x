import { NextResponse } from "next/server";
import { getTickers } from "@/app/lib/market";

/** Headline tickers for the landing page. Cached server-side so the homepage
 *  does not put every visitor's browser directly onto Binance's rate limit. */
export async function GET() {
  const tickers = await getTickers(["BTCUSDT", "ETHUSDT"]);

  return NextResponse.json(tickers, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=300",
    },
  });
}
