import React from "react";


interface CoinData {
  id: string;
  name: string;
  symbol: string;
  market_cap: number;
  total_volume: number;
  circulating_supply: number;
  image: string
  price_change_percentage_24h: number;
  coinPrice: number;
  current_price: number
}
const formatNumber = (value?: number): string => {
  if (value === undefined || value === null) {
    return "N/A"; // ✅ Return "N/A" instead of breaking
  }
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`; // Trillion
  } else if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`; // Billion
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`; // Million
  } else {
    return value.toLocaleString(); // Default formatting
  }
};
const MarketInfo: React.FC<{ coinData: CoinData | null }> = ({ coinData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in">
      {/* Market Cap */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <h3 className="text-sm text-gray-500 mb-1">Market Cap</h3>
        <p className="text-lg font-semibold">${formatNumber(coinData?.market_cap)}</p>
      </div>

      {/* Total Volume */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <h3 className="text-sm text-gray-500 mb-1">Total Volume</h3>
        <p className="text-lg font-semibold">${formatNumber(coinData?.total_volume)}</p>
      </div>

      {/* Circulating Supply */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <h3 className="text-sm text-gray-500 mb-1">Circulating Supply</h3>
        <p className="text-lg font-semibold">
          {formatNumber(coinData?.circulating_supply)} {coinData?.symbol.toUpperCase()}
        </p>
      </div>
    </div>
  );
};

export default MarketInfo;
