import type { GlobalStats } from "@/app/lib/market";
import {
  formatCompactUsd,
  formatCompactNumber,
  formatPercent,
  signalTextClass,
} from "@/app/lib/format";

/**
 * Whole-market figures, as stat tiles rather than charts: each one is a single
 * current value, and a value with no series behind it does not want a plot.
 * Bitcoin dominance is the exception — it is a share of a whole, so it gets a
 * meter.
 */
export default function StatsBand({ stats }: { stats: GlobalStats | null }) {
  if (!stats) return null;

  return (
    <dl className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
      <Tile label="Total market cap" value={formatCompactUsd(stats.marketCap)}>
        <span
          className={`font-mono text-xs ${signalTextClass(stats.marketCapChange24h)}`}
          data-numeric
        >
          {formatPercent(stats.marketCapChange24h)}
        </span>
        <span className="text-xs text-ink-muted">over 24h</span>
      </Tile>

      <Tile label="24h volume" value={formatCompactUsd(stats.volume24h)}>
        <span className="text-xs text-ink-muted">Traded across all pairs</span>
      </Tile>

      <Tile
        label="Bitcoin dominance"
        value={`${stats.btcDominance.toFixed(1)}%`}
      >
        <span className="text-xs text-ink-muted">of total market cap</span>
        <span
          aria-hidden="true"
          className="mt-2 block h-1 w-full max-w-[140px] overflow-hidden rounded-full bg-surface-raised"
        >
          <span
            className="block h-full rounded-full bg-ink"
            style={{ width: `${Math.min(100, Math.max(0, stats.btcDominance))}%` }}
          />
        </span>
      </Tile>

      <Tile label="Coins tracked" value={formatCompactNumber(stats.activeCoins)}>
        <span className="text-xs text-ink-muted">250 listed for trading</span>
      </Tile>
    </dl>
  );
}

/** Below `md` the band is a 2x2 grid, so the flush-to-the-page-edge rule is
 *  held back until it is a single row and only the two outer tiles touch the
 *  page edge. */
function Tile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface px-5 py-6 md:px-6 md:first:pl-0 md:last:pr-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd>
        <div
          className="mt-1.5 font-mono text-2xl font-medium tracking-tight md:text-[1.75rem]"
          data-numeric
        >
          {value}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">{children}</div>
      </dd>
    </div>
  );
}
