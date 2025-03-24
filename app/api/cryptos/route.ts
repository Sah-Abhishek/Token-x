import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false");
    const data = await response.json();

    // Define the expected type of each cryptocurrency
    interface Crypto {
      name: string;
      price: number;
      change: string;
      marketCap: string;
      volume: string;
    }

    // Extract only necessary fields
    const cryptocurrencies: Crypto[] = data.map((coin: any) => ({
      name: coin.name,
      price: coin.current_price,
      change: `${coin.price_change_percentage_24h.toFixed(2)}%`,
      marketCap: `$${(coin.market_cap / 1e9).toFixed(1)}B`, // Convert to billions
      volume: `$${(coin.total_volume / 1e9).toFixed(1)}B`,
      image: coin.image
    }));

    return NextResponse.json(cryptocurrencies, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
