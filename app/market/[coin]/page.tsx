"use client";
import React, { useState, useEffect } from "react";
import Image from 'next/image';
import { useParams } from "next/navigation";
import { Star } from "lucide-react";
import MarketInfo from "@/app/components/Marketinfo";
import OrderPanel from "@/app/components/OrderPanel";
import Portfolio from "@/app/components/Portfolio";
import CandleChart from "@/app/components/CandleChart";
import PriceChart from "@/app/components/PriceChart";
import Navbar from "@/app/components/Navbar";

const CoinPage: React.FC = () => {
  interface CoinData {
    id: string;
    name: string;
    symbol: string;
    market_cap: number;
    total_volume: number;
    circulating_supply: number;
    image: string;
    price_change_percentage_24h: number;
    coinPrice: number;
    current_price: number;
  }

  const params = useParams() as { coin?: string }; // ✅ Explicitly define type
  const coin = params.coin ? params.coin.toUpperCase() : "";

  const [selectedChart, setSelectedChart] = useState<string>("candlestick");
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    console.log("Fetching data for:", coin);

    const fetchMarketData = async () => {
      setLoading(true);
      setError(false);
      try {
        const formattedCoin = coin.toLowerCase().replace(/\s+/g, '-');
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${formattedCoin}`
        );
        const data = await response.json();

        if (data.length > 0) {
          setCoinData(data[0]); // ✅ Store coin data
        } else {
          setCoinData(null);
          setError(true);
        }
      } catch (error) {
        console.error("Error fetching market data:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (coin) fetchMarketData(); // ✅ Call function when coin changes
  }, [coin]);

  useEffect(() => {
    const savedChart = localStorage.getItem("selectedChart");
    if (savedChart) setSelectedChart(savedChart);
  }, []);

  // console.log("This is the coinData: ", coinData);
  const handleChartSelection = (chartType: string) => {
    setSelectedChart(chartType);
    localStorage.setItem("selectedChart", chartType);
  };

  if (!coin) return <div>Loading...</div>;
  if (error) return <div>Error fetching data. Please try again.</div>;

  return (
    <div className="text-black min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Image
                  src={coinData?.image || "/default-coin.png"}
                  alt={coinData?.name || "Coin Image"}
                  height={40}
                  width={40}
                  className="rounded-full"
                />
                <h1 className="text-2xl font-bold">
                  {coinData?.name || "Loading..."}
                  <span className="text-gray-500 ml-1">
                    ({coinData?.symbol?.toUpperCase() || "N/A"})
                  </span>
                </h1>
              </div>
              <div className="flex items-center">
                {loading ? (
                  <span className="text-lg">Fetching price...</span>
                ) : (
                  <>
                    <span className="text-3xl font-semibold mr-3">
                      ${coinData?.current_price.toLocaleString() || "N/A"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-sm font-medium ${(coinData?.price_change_percentage_24h ?? 0) < 0  // ✅ Default to 0 if undefined
                          ? "text-red-600 bg-red-50"
                          : "text-green-600 bg-green-50"
                        }`}
                    >
                      {(coinData?.price_change_percentage_24h ?? 0).toFixed(2)}%  {/* ✅ Prevent undefined */}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <button className="flex items-center gap-2 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Star size={18} />
                <span>Add to Watchlist</span>
              </button>
              <button className="py-2 px-6 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors">
                Trade Now
              </button>
            </div>
          </div>
        </div>

        <MarketInfo coinData={coinData} />

        {/* Conditionally Render the Selected Chart */}
        <div>
          {selectedChart === "candlestick" ? (
            <CandleChart
              handleChartSelection={handleChartSelection}
              selectedChart={selectedChart}
            />
          ) : (
            <PriceChart
              handleChartSelection={handleChartSelection}
              selectedChart={selectedChart}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-2">
            <OrderPanel />
          </div>

          <div>
            <Portfolio />
          </div>
        </div>
      </div>
    </div >
  );
};

export default CoinPage;
