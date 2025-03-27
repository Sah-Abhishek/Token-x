"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi } from "lightweight-charts";
import { FaChartLine } from "react-icons/fa6";
import { MdOutlineCandlestickChart } from "react-icons/md";
import {
  CandlestickData,
  UTCTimestamp // Add this import
} from "lightweight-charts";

type TimeFilter = "1M" | "5M" | "15M" | "1H" | "4H" | "1D" | "1W";

type BinanceKline = [
  number,   // Open time
  string,   // Open price
  string,   // High price
  string,   // Low price
  string,   // Close price
  string,   // Volume
  number,   // Close time
  string,   // Quote asset volume
  number,   // Number of trades
  string,   // Taker buy base asset volume
  string,   // Taker buy quote asset volume
  string    // Ignore field
];

const timeFilterToInterval: Record<TimeFilter, string> = {
  "1M": "1m",
  "5M": "5m",
  "15M": "15m",
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
  "1W": "1w",
};

const CandleChart = ({ selectedChart, handleChartSelection }: { selectedChart: string; handleChartSelection: (chart: string) => void }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1D");
  const chartInstance = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 400,
      layout: { background: { color: "#ffffff" }, textColor: "#000" },
      grid: { vertLines: { color: "#eeeeee" }, horzLines: { color: "#eeeeee" } },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderUpColor: "#16a34a",
      borderDownColor: "#dc2626",
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });

    chartInstance.current = chart;

    const fetchData = async () => {
      try {
        const interval = timeFilterToInterval[timeFilter];
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=50`
        );
        const data: BinanceKline[] = await response.json();

        const
          formattedData:
            CandlestickData[] = data.map(
              (candle: BinanceKline) => ({
                time: (candle[0] / 1000) as UTCTimestamp, // Cast to UTCTimestamp
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
              }));

        candleSeries.setData(formattedData);

        if (formattedData.length > 0) {
          const lastCandle = formattedData[formattedData.length - 1];
          const firstVisibleCandle = formattedData[Math.max(0, formattedData.length - 30)];

          chart.timeScale().setVisibleRange({
            from: firstVisibleCandle.time,
            to: lastCandle.time,
          });
        }
      } catch (error) {
        console.error("Error fetching candlestick data:", error);
      }
    };

    fetchData();

    return () => {
      chartInstance.current?.remove();
    };
  }, [timeFilter]);

  // ... rest of the component remains the same ...

  return (
    <div className="w-full p-4 rounded-lg shadow border border-gray-100">
      {/* Top Bar: Time Filters (Left) & Chart Selection Icons (Right) */}
      <div className="flex justify-between items-center mb-4">
        {/* Time Filters (Left-Aligned) */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {Object.keys(timeFilterToInterval).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter as TimeFilter)}
              className={`px-3 py-1 text-xs rounded-md transition-all ${timeFilter === filter ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Chart Selection Icons (Right-Aligned) */}
        <div className="flex space-x-2">
          <button
            onClick={() => handleChartSelection("line")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${selectedChart === "line" ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            <FaChartLine size={18} />
          </button>

          <button
            onClick={() => handleChartSelection("candlestick")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${selectedChart === "candlestick" ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            <MdOutlineCandlestickChart size={18} />
          </button>
        </div>
      </div>

      <div ref={chartRef} className="w-full h-[400px]"></div>
    </div>
  );
};

export default CandleChart;
