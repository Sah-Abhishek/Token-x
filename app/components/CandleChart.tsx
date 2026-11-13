"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, type CandlestickData, type UTCTimestamp } from "lightweight-charts";
import ChartToolbar, { type TimeFilter, timeFilterToInterval } from "./ChartToolbar";

type BinanceKline = [
  number, string, string, string, string, string,
  number, string, number, string, string, string,
];

interface CandleChartProps {
  /** Coin ticker, e.g. "btc". Resolved to a Binance pair as <SYMBOL>USDT. */
  symbol: string;
  selectedChart: string;
  handleChartSelection: (chart: string) => void;
}

const CandleChart = ({ symbol, selectedChart, handleChartSelection }: CandleChartProps) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1D");
  const [unavailable, setUnavailable] = useState(false);

  // The chart was previously hardcoded to BTCUSDT, so every coin's page
  // showed Bitcoin's candles under that coin's name.
  const pair = symbol ? `${symbol.toUpperCase()}USDT` : "";

  useEffect(() => {
    if (!chartRef.current || !pair) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 400,
      layout: { background: { color: "#ffffff" }, textColor: "#111827" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      rightPriceScale: { borderColor: "#f3f4f6" },
      timeScale: { borderColor: "#f3f4f6" },
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

    // Keep the chart readable when the viewport changes.
    const onResize = () => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener("resize", onResize);

    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const interval = timeFilterToInterval[timeFilter];
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=200`,
          { signal: controller.signal },
        );

        // Binance 400s on an unknown pair; say so instead of showing nothing.
        if (!response.ok) {
          setUnavailable(true);
          return;
        }

        const data: BinanceKline[] = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          setUnavailable(true);
          return;
        }

        setUnavailable(false);

        const formatted: CandlestickData[] = data.map((candle) => ({
          time: (candle[0] / 1000) as UTCTimestamp,
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
        }));

        candleSeries.setData(formatted);
        chart.timeScale().fitContent();
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Error fetching candlestick data:", error);
          setUnavailable(true);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
      window.removeEventListener("resize", onResize);
      chartInstance.current?.remove();
      chartInstance.current = null;
    };
  }, [timeFilter, pair]);

  return (
    <div className="w-full p-4 rounded-lg bg-surface border border-line animate-fade-in">
      <ChartToolbar
        pair={pair}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        selectedChart={selectedChart}
        onChartSelection={handleChartSelection}
      />

      {/* The container stays mounted so the ref survives an empty state and a
          later timeframe change can re-initialise the chart. */}
      <div className="relative w-full h-[400px]">
        <div
          ref={chartRef}
          className={`w-full h-[400px] ${!pair || unavailable ? "invisible" : ""}`}
        />

        {(!pair || unavailable) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-surface-sunken rounded-md">
            <p className="font-medium mb-1">
              {pair ? "No candle data for this pair" : "Loading chart…"}
            </p>
            {pair && (
              <p className="text-sm text-ink-muted max-w-xs">
                {pair} is not listed on Binance, so there is no OHLC feed for it yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CandleChart;
