"use client";

import React, { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import ChartToolbar, { type TimeFilter, timeFilterToInterval } from "./ChartToolbar";
import { formatUsd } from "../lib/format";

interface ChartData {
  label: string;
  value: number;
  tooltipDate: string;
}

interface PriceChartProps {
  /** Coin ticker, e.g. "eth". Resolved to a Binance pair as <SYMBOL>USDT. */
  symbol: string;
  selectedChart: string;
  handleChartSelection: (chart: string) => void;
}

/** Intraday intervals need a time-of-day axis label; the old code formatted
 *  every point as YYYY-MM-DD, so a 1m chart showed the same label 50 times. */
const INTRADAY: TimeFilter[] = ["1M", "5M", "15M", "1H", "4H"];

const axisLabel = (date: Date, filter: TimeFilter): string =>
  INTRADAY.includes(filter)
    ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const PriceChart: React.FC<PriceChartProps> = ({
  symbol,
  selectedChart,
  handleChartSelection,
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1D");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const pair = symbol ? `${symbol.toUpperCase()}USDT` : "";

  useEffect(() => {
    if (!pair) return;

    const controller = new AbortController();

    const fetchSeries = async () => {
      setLoading(true);

      try {
        const interval = timeFilterToInterval[timeFilter];
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=200`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          setUnavailable(true);
          setChartData([]);
          return;
        }

        const data: [number, string, string, string, string][] = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          setUnavailable(true);
          setChartData([]);
          return;
        }

        setUnavailable(false);
        setChartData(
          data.map(([timestamp, , , , closePrice]) => {
            const date = new Date(timestamp);
            return {
              label: axisLabel(date, timeFilter),
              value: parseFloat(closePrice),
              tooltipDate: date.toLocaleString(),
            };
          }),
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Error fetching price data:", error);
          setUnavailable(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchSeries();
    return () => controller.abort();
  }, [timeFilter, pair]);

  const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { tooltipDate, value } = payload[0].payload as ChartData;

    return (
      <div className="bg-surface p-3 rounded-lg shadow-md border border-line">
        <p className="text-xs text-ink-muted mb-0.5">{tooltipDate}</p>
        <p className="font-medium text-ink" data-numeric>
          {formatUsd(value)}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full bg-surface p-4 rounded-lg border border-line animate-fade-in">
      <ChartToolbar
        pair={pair}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        selectedChart={selectedChart}
        onChartSelection={handleChartSelection}
      />

      <div className="h-80 w-full">
        {loading || !pair ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-ink-muted animate-pulse-subtle">Loading chart…</p>
          </div>
        ) : unavailable ? (
          <div className="h-full flex flex-col items-center justify-center text-center bg-surface-sunken rounded-md">
            <p className="font-medium mb-1">No price history for this pair</p>
            <p className="text-sm text-ink-muted max-w-xs">
              {pair} is not listed on Binance, so there is no candle feed for it yet.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                minTickGap={40}
                tick={{ fontSize: 10, fill: "#6b7280" }}
              />
              <YAxis
                // Relative padding. A hardcoded ±500 made sub-dollar assets
                // render as a flat line pinned to the middle of the chart.
                domain={[
                  (min: number) => min * 0.995,
                  (max: number) => max * 1.005,
                ]}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickFormatter={(value: number) => formatUsd(value)}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#16a34a"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PriceChart;
