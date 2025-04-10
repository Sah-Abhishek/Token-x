import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false");
    const data = await response.json();
    // console.log("Data in backend: ", data.length);

    // Define the expected type of each cryptocurrency
    interface Crypto {
      id: string,
      symbol: string,
      name: string;
      price: number;
      change: string;
      marketCap: string;
      volume: string;
    }

    // Define the type of API response
    interface CoinGeckoApiResponse {
      id: string,
      symbol: string,
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
      market_cap: number;
      total_volume: number;
      image: string;
      change: string;
    }

    // Extract only necessary fields
    const cryptocurrencies: Crypto[] = data.map((coin: CoinGeckoApiResponse) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      price: coin.current_price,
      change: `${(coin.price_change_percentage_24h || 0).toFixed(2)}%`,
      marketCap: `$${(coin.market_cap / 1e9).toFixed(1)}B`, // Convert to billions
      volume: `$${(coin.total_volume / 1e9).toFixed(1)}B`,
      image: coin.image
    }));

    // console.log("\nThese are the cryptocurrencies: ", cryptocurrencies.length, "\n");

    return NextResponse.json(cryptocurrencies, { status: 200 });
  } catch (err) {
    // Optionally log the error if needed
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
