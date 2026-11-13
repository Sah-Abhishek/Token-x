import Link from "next/link";
import type { Crypto } from "@/app/lib/market";
import { formatUsd, formatPercent, signalTextClass } from "@/app/lib/format";

/**
 * The full-bleed price tape under the nav.
 *
 * It exists for one reason: the first thing a visitor should learn about this
 * product is that the numbers in it are live. A static screenshot of a tape
 * would say the same thing and be a lie, so this one carries the same prices
 * the market table below it is showing.
 *
 * The track holds the list twice. Travelling exactly half the track's width
 * lands on an identical frame, so the loop has no seam and needs no JS. It
 * pauses on hover (people do stop to read a row) and is held still outright
 * under `prefers-reduced-motion` — a tape that never stops is the one piece
 * of motion here that cannot merely be shortened.
 */
export default function TickerTape({ coins }: { coins: Crypto[] }) {
  if (coins.length < 4) return null;

  return (
    <div className="border-b border-line bg-surface-sunken">
      <div className="edge-fade-x overflow-hidden">
        {/* w-max: the track is as wide as its content, so -50% is exactly one
            copy of the list regardless of how long the symbols turn out. */}
        <div className="ticker-track flex w-max">
          <TapeRow coins={coins} />
          <TapeRow coins={coins} duplicate />
        </div>
      </div>
    </div>
  );
}

function TapeRow({
  coins,
  duplicate = false,
}: {
  coins: Crypto[];
  duplicate?: boolean;
}) {
  return (
    <ul
      className="flex shrink-0 items-center"
      // The second copy is the same content again; a screen reader should
      // hear the list once.
      aria-hidden={duplicate || undefined}
      aria-label={duplicate ? undefined : "Live prices"}
    >
      {coins.map((coin) => (
        <li key={coin.id} className="shrink-0 border-r border-line">
          <Link
            href={`/market/${coin.id}`}
            tabIndex={duplicate ? -1 : undefined}
            className="flex items-baseline gap-2.5 px-5 py-2.5 text-sm hover:bg-surface"
          >
            <span className="font-mono text-xs font-medium uppercase text-ink">
              {coin.symbol}
            </span>
            <span className="font-mono text-xs text-ink-body" data-numeric>
              {formatUsd(coin.price)}
            </span>
            <span
              className={`font-mono text-xs ${signalTextClass(coin.change)}`}
              data-numeric
            >
              {formatPercent(coin.change)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
