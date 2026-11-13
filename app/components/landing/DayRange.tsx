import { formatUsd } from "@/app/lib/format";

/**
 * Where the current price sits between the day's low and high.
 *
 * A single value against a known interval is a position-in-range meter, not a
 * chart: the track is the interval, the marker is the value. The endpoints are
 * labelled because the marker alone cannot tell you whether the band is a
 * dollar wide or a thousand.
 */
export default function DayRange({
  low,
  high,
  price,
}: {
  low: number | null;
  high: number | null;
  price: number;
}) {
  // A collapsed or inverted band would put the marker somewhere meaningless,
  // so nothing is drawn rather than something wrong.
  if (low === null || high === null || !(high > low)) return null;

  const position = Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100));

  return (
    <div className="w-full max-w-[220px]">
      <div
        className="relative h-[3px] rounded-full bg-surface-raised"
        role="img"
        aria-label={`24 hour range ${formatUsd(low)} to ${formatUsd(high)}, now at ${formatUsd(price)}`}
      >
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${position}%` }}
        />
      </div>

      <div
        className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-muted"
        aria-hidden="true"
        data-numeric
      >
        <span>{formatUsd(low)}</span>
        <span>{formatUsd(high)}</span>
      </div>
    </div>
  );
}
