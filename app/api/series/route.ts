import { NextResponse } from "next/server";
import { getSeries, CHART_RANGES, type ChartRange } from "@/app/lib/market";

/** Price series for the landing-page chart, cached server-side so switching
 *  ranges does not put the visitor's browser onto Binance's rate limit. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "BTC").toUpperCase();
  const range = searchParams.get("range") ?? "7D";

  if (!(range in CHART_RANGES)) {
    return NextResponse.json(
      { error: `Unknown range. Expected one of: ${Object.keys(CHART_RANGES).join(", ")}` },
      { status: 400 },
    );
  }

  // Keep this endpoint from being used as an open proxy to arbitrary pairs.
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const series = await getSeries(symbol, range as ChartRange);

  if (!series) {
    return NextResponse.json({ error: "No series for that pair" }, { status: 404 });
  }

  return NextResponse.json(series, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
    },
  });
}
