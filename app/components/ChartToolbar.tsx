"use client";

import { FaChartLine } from "react-icons/fa6";
import { MdOutlineCandlestickChart } from "react-icons/md";

/**
 * Shared chart controls. The timeframe buttons and chart-type toggle were
 * duplicated verbatim in CandleChart and PriceChart, so they drifted apart;
 * both now render this one component.
 */

export type TimeFilter = "1M" | "5M" | "15M" | "1H" | "4H" | "1D" | "1W";

export const timeFilterToInterval: Record<TimeFilter, string> = {
  "1M": "1m",
  "5M": "5m",
  "15M": "15m",
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
  "1W": "1w",
};

interface ChartToolbarProps {
  pair: string;
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  selectedChart: string;
  onChartSelection: (chart: string) => void;
}

export default function ChartToolbar({
  pair,
  timeFilter,
  onTimeFilterChange,
  selectedChart,
  onChartSelection,
}: ChartToolbarProps) {
  return (
    <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
      <div className="flex items-center gap-3">
        {/* Naming the pair makes it unambiguous which feed is on screen. */}
        {pair && (
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
            {pair}
          </span>
        )}

        <div
          className="flex gap-1 overflow-x-auto"
          role="group"
          aria-label="Chart timeframe"
        >
          {(Object.keys(timeFilterToInterval) as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={timeFilter === filter}
              onClick={() => onTimeFilterChange(filter)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                timeFilter === filter
                  ? "bg-ink text-ink-inverse"
                  : "bg-surface-raised text-ink-body hover:bg-line-strong"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2" role="group" aria-label="Chart type">
        <button
          type="button"
          aria-label="Line chart"
          aria-pressed={selectedChart === "line"}
          onClick={() => onChartSelection("line")}
          className={`flex items-center px-3 py-2 rounded-md transition-colors ${
            selectedChart === "line"
              ? "bg-ink text-ink-inverse"
              : "bg-surface-raised text-ink-body hover:bg-line-strong"
          }`}
        >
          <FaChartLine size={18} aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Candlestick chart"
          aria-pressed={selectedChart === "candlestick"}
          onClick={() => onChartSelection("candlestick")}
          className={`flex items-center px-3 py-2 rounded-md transition-colors ${
            selectedChart === "candlestick"
              ? "bg-ink text-ink-inverse"
              : "bg-surface-raised text-ink-body hover:bg-line-strong"
          }`}
        >
          <MdOutlineCandlestickChart size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
