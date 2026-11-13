"use client";

import { formatUsd } from "@/app/lib/format";

/** The stake control every game shares, so a stake behaves the same way in
 *  all three rather than three slightly different number boxes. */
export default function StakeField({
  id,
  stake,
  onChange,
  balance,
  min,
  max,
  disabled,
}: {
  id: string;
  stake: string;
  onChange: (next: string) => void;
  balance: number;
  min: number;
  max: number;
  disabled?: boolean;
}) {
  const affordable = Math.min(max, Math.floor(balance * 100) / 100);

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-body">
        Stake (USD)
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step="0.01"
        inputMode="decimal"
        value={stake}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-line-strong p-3 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ink disabled:opacity-50"
        data-numeric
      />

      <div className="mt-2 flex flex-wrap gap-2">
        {[1, 5, 25, 100].map((value) => (
          <button
            key={value}
            type="button"
            disabled={disabled || value > balance}
            onClick={() => onChange(String(value))}
            className="press rounded-md bg-surface-raised px-2.5 py-1 font-mono text-xs text-ink-body hover:bg-line-strong disabled:opacity-40"
          >
            ${value}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled || affordable < min}
          onClick={() => onChange(String(affordable))}
          className="press rounded-md bg-surface-raised px-2.5 py-1 font-mono text-xs text-ink-body hover:bg-line-strong disabled:opacity-40"
        >
          Max
        </button>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        Between {formatUsd(min)} and {formatUsd(max)} a round.
      </p>
    </div>
  );
}
