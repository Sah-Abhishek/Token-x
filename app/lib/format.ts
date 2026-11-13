/**
 * Display formatting for the design system.
 *
 * Numbers are formatted in exactly one place so a price reads identically in
 * the market table, the coin header and the portfolio. Raw numbers travel
 * through the app; they are only stringified at the moment of render.
 */

/** Compact USD: $2.03T, $412.5B, $87.4M, $12.1K, $412 */
export function formatCompactUsd(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) return "—";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

/**
 * Full USD price. Sub-dollar assets need more precision than two decimals,
 * otherwise every meme coin renders as "$0.00".
 */
export function formatUsd(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  const abs = Math.abs(value);
  const digits = abs === 0 ? 2 : abs < 0.01 ? 8 : abs < 1 ? 4 : 2;

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Signed percentage, e.g. +2.54% / -3.42% */
export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/** Plain compact count, for supply figures: 19.87M */
export function formatCompactNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) return "—";

  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Token quantity: trims trailing zeros but keeps small amounts legible. */
export function formatAmount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

/**
 * The system's one rule for market signal colour. Returning the full class
 * string keeps up/down styling from drifting between components.
 */
export function signalClasses(value: number | null | undefined): string {
  const positive = typeof value === "number" && Number.isFinite(value) ? value >= 0 : true;
  return positive ? "text-up bg-up-surface" : "text-down bg-down-surface";
}

export function signalTextClass(value: number | null | undefined): string {
  const positive = typeof value === "number" && Number.isFinite(value) ? value >= 0 : true;
  return positive ? "text-up" : "text-down";
}
