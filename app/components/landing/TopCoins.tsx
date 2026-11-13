import Image from "next/image";
import Link from "next/link";
import Sparkline from "./Sparkline";
import DayRange from "./DayRange";
import type { CryptoWithSparkline } from "@/app/lib/market";
import { formatUsd, formatCompactUsd, formatPercent, signalTextClass } from "@/app/lib/format";

/** Volume drops out below `md`: on a phone the table is already at the width
 *  of the screen, and price and 24h are what a reader is there for. */
const COLUMNS = [
  // Padding mirrors the body cells, so every heading sits over its column.
  { label: "Coin", className: "pr-4 text-left" },
  { label: "24h range", className: "hidden px-4 text-left lg:table-cell" },
  { label: "Price", className: "px-4 text-right" },
  { label: "24h", className: "px-4 text-right" },
  { label: "7 days", className: "px-4 text-right" },
  { label: "24h volume", className: "hidden px-4 text-right md:table-cell" },
  { label: "Market cap", className: "px-4 text-right" },
  { label: "", className: "pl-4 text-right" },
] as const;

/**
 * The market in a table, because the data is tabular. This replaced three
 * identical icon cards, which encoded nothing about the content.
 */
export default function TopCoins({ coins }: { coins: CryptoWithSparkline[] }) {
  if (coins.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        The price feed is not responding. Prices return when it does.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            {COLUMNS.map((column) => (
              <th
                key={column.label || "action"}
                scope="col"
                className={`pb-3 text-xs font-normal text-ink-muted ${column.className}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {coins.map((coin) => (
            <tr key={coin.id} className="border-b border-line lift hover:bg-surface-sunken">
              <td className="py-4 pr-4">
                <Link
                  href={`/market/${coin.id}`}
                  className="flex items-center gap-3 group"
                >
                  {coin.image && (
                    <Image
                      src={coin.image}
                      alt=""
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  )}
                  <span className="font-medium group-hover:underline decoration-line-strong underline-offset-4">
                    {coin.name}
                  </span>
                  <span className="font-mono text-xs text-ink-muted uppercase">
                    {coin.symbol}
                  </span>
                </Link>
              </td>

              <td className="hidden py-4 px-4 lg:table-cell">
                <DayRange low={coin.low24h} high={coin.high24h} price={coin.price} />
              </td>

              <td className="py-4 px-4 text-right font-mono text-sm" data-numeric>
                {formatUsd(coin.price)}
              </td>

              <td
                className={`py-4 px-4 text-right font-mono text-sm ${signalTextClass(coin.change)}`}
                data-numeric
              >
                {formatPercent(coin.change)}
              </td>

              <td className="py-4 px-4">
                <div className="flex justify-end">
                  <Sparkline
                    width={128}
                    height={32}
                    values={coin.sparkline}
                    positive={
                      coin.sparkline.length > 1
                        ? coin.sparkline[coin.sparkline.length - 1] >= coin.sparkline[0]
                        : coin.change >= 0
                    }
                  />
                </div>
              </td>

              <td
                className="hidden py-4 px-4 text-right font-mono text-sm text-ink-muted md:table-cell"
                data-numeric
              >
                {formatCompactUsd(coin.volume)}
              </td>

              <td
                className="py-4 px-4 text-right font-mono text-sm text-ink-muted"
                data-numeric
              >
                {formatCompactUsd(coin.marketCap)}
              </td>

              <td className="py-4 pl-4 text-right">
                <Link
                  href={`/market/${coin.id}`}
                  className="inline-block text-xs px-3 py-1.5 rounded-md border border-line-strong text-ink-body press hover:bg-ink hover:text-ink-inverse hover:border-ink"
                >
                  Trade
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
