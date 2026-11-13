import Image from "next/image";
import Link from "next/link";
import type { Crypto } from "@/app/lib/market";
import { formatUsd, formatPercent, signalTextClass } from "@/app/lib/format";

/**
 * The day's biggest moves, as two ranked bar lists.
 *
 * The bar is the row's own background, anchored to the left edge and scaled
 * against the largest move in that column, which is how an exchange draws
 * depth. It encodes the same number as the percentage beside it, so it is
 * hidden from assistive tech rather than announced twice.
 *
 * One series per column and the heading names it, so neither list needs a
 * legend.
 */
export default function Movers({
  gainers,
  losers,
}: {
  gainers: Crypto[];
  losers: Crypto[];
}) {
  if (gainers.length === 0 && losers.length === 0) return null;

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-10">
      <MoverList title="Up the most today" coins={gainers} />
      <MoverList title="Down the most today" coins={losers} />
    </div>
  );
}

function MoverList({ title, coins }: { title: string; coins: Crypto[] }) {
  if (coins.length === 0) return null;

  // Scaled against the column's own largest move, so the longest bar always
  // reaches the end and the differences between rows stay readable.
  const peak = Math.max(...coins.map((coin) => Math.abs(coin.change)));

  return (
    <section>
      <h3 className="text-sm font-medium text-ink">{title}</h3>

      <ul className="mt-3 space-y-px">
        {coins.map((coin) => {
          const width = peak > 0 ? (Math.abs(coin.change) / peak) * 100 : 0;
          const up = coin.change >= 0;

          return (
            <li key={coin.id} className="relative bg-surface">
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 rounded-r ${
                  up ? "bg-up-surface" : "bg-down-surface"
                }`}
                style={{ width: `${width}%` }}
              />

              <Link
                href={`/market/${coin.id}`}
                className="relative flex items-center gap-3 px-3 py-3"
              >
                {coin.image && (
                  <Image
                    src={coin.image}
                    alt=""
                    width={22}
                    height={22}
                    className="shrink-0 rounded-full"
                  />
                )}
                <span className="truncate text-sm font-medium">{coin.name}</span>
                <span className="font-mono text-[11px] uppercase text-ink-muted">
                  {coin.symbol}
                </span>

                <span
                  className="ml-auto shrink-0 font-mono text-sm text-ink-body"
                  data-numeric
                >
                  {formatUsd(coin.price)}
                </span>
                <span
                  className={`w-[70px] shrink-0 text-right font-mono text-sm ${signalTextClass(
                    coin.change,
                  )}`}
                  data-numeric
                >
                  {formatPercent(coin.change)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
