import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false");
    const data = await response.json();

    interface Crypto {
      id: string;
      symbol: string;
      name: string;
      price: number;
      change: string;
      marketCap: string;
      volume: string;
      image: string;
    }

    interface CoinGeckoApiResponse {
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number | null; // Allow null values
      market_cap: number;
      total_volume: number;
      image: string;
    }

    const cryptocurrencies: Crypto[] = data.map((coin: CoinGeckoApiResponse) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      price: coin.current_price,
      change: `${(coin.price_change_percentage_24h ?? 0).toFixed(2)}%`, // Fallback to 0 if null
      marketCap: `$${(coin.market_cap / 1e9).toFixed(1)}B`, // Convert to billions
      volume: `$${(coin.total_volume / 1e9).toFixed(1)}B`,
      image: coin.image
    }));

    return NextResponse.json(cryptocurrencies, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
