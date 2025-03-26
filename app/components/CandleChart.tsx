"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi } from "lightweight-charts";
import { FaChartLine } from "react-icons/fa6";
import { MdOutlineCandlestickChart } from "react-icons/md";

type TimeFilter = "1M" | "5M" | "15M" | "1H" | "4H" | "1D" | "1W";

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

    // Create chart instance
    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 400,
      layout: { background: { color: "#ffffff" }, textColor: "#000" },
      grid: { vertLines: { color: "#eeeeee" }, horzLines: { color: "#eeeeee" } },
    });

    // ✅ Correct method to add candlestick series
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
        const data = await response.json();

        const formattedData = data.map((candle: any) => ({
          time: candle[0] / 1000, // Convert timestamp to seconds
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
        }));

        candleSeries.setData(formattedData);
      } catch (error) {
        console.error("Error fetching candlestick data:", error);
      }
    };

    fetchData();

    return () => {
      chartInstance.current?.remove();
    };
  }, [timeFilter]);

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
