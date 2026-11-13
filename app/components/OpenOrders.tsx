"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { OrderRow } from "@/app/lib/orders";
import { formatUsd, formatAmount, formatPercent, signalTextClass } from "@/app/lib/format";

/**
 * Resting and recently settled orders.
 *
 * Reading /api/orders re-prices open orders server-side first, so opening
 * this list is also what discovers that the market has reached a limit. That
 * is deliberate: the app has no always-on scheduler, and an order that only
 * moved when a cron happened to run would be worse than one that settles the
 * moment you look at it.
 */
export default function OpenOrders({
  coinId,
  refreshKey = 0,
  onChanged,
}: {
  /** Narrows the list to one coin. Omit for every order on the account. */
  coinId?: string;
  /** Bumped by the parent after a trade, to pull a fresh list. */
  refreshKey?: number;
  onChanged?: () => void;
}) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");

      if (res.status === 401) {
        setOrders([]);
        return;
      }

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "Your orders could not be loaded.");
        return;
      }

      setError(null);
      setOrders(body.orders as OrderRow[]);
    } catch {
      setError("Your orders could not be loaded.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const cancel = async (id: string) => {
    setCancelling(id);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "The order could not be cancelled.");
        return;
      }

      setError(null);
      await load();
      onChanged?.();
    } finally {
      setCancelling(null);
    }
  };

  if (orders === null && !error) {
    return <p className="text-sm text-ink-muted">Loading orders…</p>;
  }

  const visible = (orders ?? []).filter((order) => !coinId || order.coinId === coinId);
  const open = visible.filter((order) => order.status === "OPEN");
  const settled = visible.filter((order) => order.status !== "OPEN").slice(0, 8);

  if (error) {
    return <p className="text-sm text-down">{error}</p>;
  }

  if (visible.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No limit orders yet. A limit order rests until the market reaches your
        price, and the cash or tokens behind it are held aside in the meantime.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {open.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ink">Resting</h3>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {open.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <OrderIdentity order={order} />

                <div className="ml-auto flex items-center gap-4">
                  <Distance order={order} />
                  <button
                    type="button"
                    onClick={() => cancel(order.id)}
                    disabled={cancelling === order.id}
                    className="press rounded-md border border-line-strong px-3 py-1.5 text-xs text-ink-body hover:bg-surface-raised disabled:opacity-40"
                  >
                    {cancelling === order.id ? "Cancelling…" : "Cancel"}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-ink-muted">
            Prices are re-checked whenever you open this list. A fill uses the
            price at that moment, which for a buy is never above your limit and
            for a sell never below it.
          </p>
        </div>
      )}

      {settled.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ink">Settled</h3>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {settled.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <OrderIdentity order={order} />
                <span className="ml-auto text-xs text-ink-muted">
                  {order.status === "FILLED" ? (
                    <>
                      Filled at{" "}
                      <span className="font-mono text-ink-body" data-numeric>
                        {formatUsd(order.fillPrice)}
                      </span>{" "}
                      for{" "}
                      <span className="font-mono text-ink-body" data-numeric>
                        {formatUsd(order.fillTotal)}
                      </span>
                    </>
                  ) : (
                    "Cancelled"
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OrderIdentity({ order }: { order: OrderRow }) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`font-mono text-xs font-medium ${
          order.side === "BUY" ? "text-up" : "text-down"
        }`}
      >
        {order.side}
      </span>
      <Link href={`/market/${order.coinId}`} className="text-sm font-medium hover:underline">
        {order.symbol}
      </Link>
      <span className="font-mono text-sm text-ink-body" data-numeric>
        {formatAmount(order.amount)}
      </span>
      <span className="text-xs text-ink-muted">at</span>
      <span className="font-mono text-sm" data-numeric>
        {formatUsd(order.limitPrice)}
      </span>
    </div>
  );
}

/** How far the market still has to move for this order to fill. */
function Distance({ order }: { order: OrderRow }) {
  if (order.marketPrice === null || order.marketPrice <= 0) {
    return <span className="text-xs text-ink-muted">No price</span>;
  }

  const gap = ((order.limitPrice - order.marketPrice) / order.marketPrice) * 100;

  return (
    <span className="text-xs text-ink-muted">
      market{" "}
      <span className="font-mono text-ink-body" data-numeric>
        {formatUsd(order.marketPrice)}
      </span>{" "}
      <span className={`font-mono ${signalTextClass(gap)}`} data-numeric>
        {formatPercent(gap)}
      </span>
    </span>
  );
}
