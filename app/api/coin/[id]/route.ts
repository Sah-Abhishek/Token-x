import { NextResponse } from "next/server";
import { lookupCoin } from "@/app/lib/market";

/** A single coin, proxied through our cache so the coin page does not hit
 *  CoinGecko once per visitor per page view. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lookup = await lookupCoin(id);

  if (lookup.status === "not_found") {
    return NextResponse.json({ error: "Coin not found" }, { status: 404 });
  }

  if (lookup.status === "unavailable") {
    // 503, not 404: the coin may well exist and the client should retry.
    return NextResponse.json(
      { error: "The price feed is not responding." },
      { status: 503 },
    );
  }

  return NextResponse.json(lookup.coin, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
    },
  });
}
