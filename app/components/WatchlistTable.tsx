"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { WatchRow } from "@/app/lib/watchlist";
import { formatUsd, formatCompactUsd, formatPercent, signalTextClass } from "@/app/lib/format";

/**
 * The watchlist, server-rendered and then edited in place.
 *
 * Removing drops the row immediately and puts it back if the request fails,
 * which is the only honest way to make a one-click remove feel instant
 * without pretending a failure did not happen.
 */
export default function WatchlistTable({ initial }: { initial: WatchRow[] }) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (coinId: string) => {
    const previous = rows;
    setBusy(coinId);
    setError(null);
    setRows((current) => current.filter((row) => row.coinId !== coinId));

    try {
      const res = await fetch(`/api/watchlist?coinId=${encodeURIComponent(coinId)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setRows(previous);
        setError(body.error ?? "That did not save.");
      }
    } catch {
      setRows(previous);
      setError("That did not save.");
    } finally {
      setBusy(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-line bg-surface-sunken p-8">
        <p className="font-medium">Nothing on your watchlist yet</p>
        <p className="mt-2 max-w-md text-sm text-ink-muted">
          Open any coin and press Follow. Everything you follow shows up here
          with its live price, so you can check a handful of coins without
          scrolling the whole market.
        </p>
        <Link
          href="/market"
          className="press mt-5 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-ink-inverse hover:opacity-90"
        >
          Browse coins
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {error && <p className="mb-4 text-sm text-down">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line text-xs text-ink-muted">
              <th scope="col" className="pb-3 pr-4 text-left font-normal">Coin</th>
              <th scope="col" className="pb-3 px-4 text-right font-normal">Price</th>
              <th scope="col" className="pb-3 px-4 text-right font-normal">24h</th>
              <th scope="col" className="hidden pb-3 px-4 text-right font-normal sm:table-cell">Market cap</th>
              <th scope="col" className="pb-3 pl-4 text-right font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.coinId} className="border-b border-line lift hover:bg-surface-sunken">
                <td className="py-4 pr-4">
                  <Link href={`/market/${row.coinId}`} className="group flex items-center gap-3">
                    {row.image && (
                      <Image src={row.image} alt="" width={26} height={26} className="rounded-full" />
                    )}
                    <span className="font-medium capitalize group-hover:underline decoration-line-strong underline-offset-4">
                      {row.name}
                    </span>
                    <span className="font-mono text-xs uppercase text-ink-muted">{row.symbol}</span>
                  </Link>
                </td>

                <td className="py-4 px-4 text-right font-mono text-sm" data-numeric>
                  {row.price === null ? "—" : formatUsd(row.price)}
                </td>

                <td
                  className={`py-4 px-4 text-right font-mono text-sm ${signalTextClass(row.change)}`}
                  data-numeric
                >
                  {row.change === null ? "—" : formatPercent(row.change)}
                </td>

                <td
                  className="hidden py-4 px-4 text-right font-mono text-sm text-ink-muted sm:table-cell"
                  data-numeric
                >
                  {formatCompactUsd(row.marketCap)}
                </td>

                <td className="py-4 pl-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/market/${row.coinId}`}
                      className="press rounded-md border border-line-strong px-3 py-1.5 text-xs text-ink-body hover:border-ink hover:bg-ink hover:text-ink-inverse"
                    >
                      Trade
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(row.coinId)}
                      disabled={busy === row.coinId}
                      className="press rounded-md px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-raised hover:text-ink disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.some((row) => row.price === null) && (
        <p className="mt-4 text-sm text-ink-muted">
          A coin with no price is one outside the top 250 by market cap, which
          is as far as the cached market list reaches. Open it for its own
          live price.
        </p>
      )}
    </div>
  );
}
