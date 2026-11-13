import React from "react";
import type { CoinDetail } from "../lib/market";
import { formatCompactUsd, formatCompactNumber } from "../lib/format";

/** Stat tiles for the coin page. Formatting comes from the shared helpers so
 *  these read identically to the market table (this component used to carry
 *  its own formatNumber, which disagreed with the table's). */
const MarketInfo: React.FC<{ coinData: CoinDetail | null }> = ({ coinData }) => {
  const stats = [
    { label: "Market Cap", value: formatCompactUsd(coinData?.marketCap) },
    { label: "Total Volume", value: formatCompactUsd(coinData?.volume) },
    {
      label: "Circulating Supply",
      value: coinData
        ? `${formatCompactNumber(coinData.circulatingSupply)} ${coinData.symbol.toUpperCase()}`
        : "—",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in">
      {stats.map(({ label, value }) => (
        <div
          key={label}
          className="bg-surface p-4 rounded-lg border border-line transition-shadow hover:shadow-sm"
        >
          <h3 className="text-sm text-ink-muted mb-1">{label}</h3>
          <p className="text-lg font-semibold" data-numeric>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
};

export default MarketInfo;
