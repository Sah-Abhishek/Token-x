"use client";

import React, { useEffect, useState } from "react";
import { formatUsd, formatAmount, formatPercent, signalTextClass } from "../lib/format";

interface OrderPanelProps {
  coinId: string;
  /** Upper-case ticker, e.g. "BTC". */
  symbol: string;
  /** Live price in USD. */
  price: number;
  balanceUSD: number | null;
  holdingAmount: number;
  unavailable: string | null;
  onTraded: () => void;
}

type OrderType = "MARKET" | "LIMIT";
type Status = { kind: "ok" | "error"; message: string } | null;

const FIELD =
  "w-full p-3 border border-line-strong rounded-md text-sm focus:outline-none " +
  "focus:ring-2 focus:ring-ink focus:border-transparent transition-shadow";

/** Trim a computed quantity to something a person would type. */
function trim(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

const OrderPanel: React.FC<OrderPanelProps> = ({
  coinId,
  symbol,
  price,
  balanceUSD,
  holdingAmount,
  unavailable,
  onTraded,
}) => {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<OrderType>("MARKET");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [submitting, setSubmitting] = useState(false);

  const ticker = symbol || "—";

  // The limit field opens at the market so it is a starting point rather than
  // an empty box, but it is never overwritten once it has been edited.
  const [limitTouched, setLimitTouched] = useState(false);
  useEffect(() => {
    if (type === "LIMIT" && !limitTouched && price > 0) {
      setLimitPrice(String(price));
    }
  }, [type, limitTouched, price]);

  const parsed = parseFloat(amount);
  const validAmount = Number.isFinite(parsed) && parsed > 0;

  const parsedLimit = parseFloat(limitPrice);
  const validLimit = type === "MARKET" || (Number.isFinite(parsedLimit) && parsedLimit > 0);

  // A market order costs what the market is asking. A limit order commits the
  // limit, which is the worst price it can fill at, so that is what gets
  // checked against the balance.
  const workingPrice = type === "LIMIT" && validLimit ? parsedLimit : price;
  const estimatedCost = validAmount ? parsed * workingPrice : 0;

  const affordable = balanceUSD === null || estimatedCost <= balanceUSD;
  const hasEnough = parsed <= holdingAmount;

  /** How far a limit sits from the market, which is the thing a reader is
   *  actually judging when they set one. */
  const limitGapPct =
    type === "LIMIT" && validLimit && price > 0 ? ((parsedLimit - price) / price) * 100 : null;

  const blocker = !validAmount
    ? null
    : type === "LIMIT" && !validLimit
      ? "Enter a limit price."
      : side === "BUY" && !affordable
        ? type === "LIMIT"
          ? "That reserves more than your balance."
          : "That costs more than your balance."
        : side === "SELL" && !hasEnough
          ? `You only hold ${formatAmount(holdingAmount)} ${ticker}.`
          : null;

  const reset = () => {
    setAmount("");
    setLimitTouched(false);
  };

  const submit = async () => {
    if (!validAmount || blocker || submitting) return;

    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch(type === "MARKET" ? "/api/trade" : "/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "MARKET" ? { coinId, side, amount } : { coinId, side, amount, limitPrice },
        ),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({ kind: "error", message: body.error ?? "The order could not be placed." });
        return;
      }

      if (type === "MARKET") {
        // Report what actually filled, from the server's numbers rather than
        // the ones typed in: the fill price is decided server-side.
        setStatus({
          kind: "ok",
          message: `${body.side === "BUY" ? "Bought" : "Sold"} ${formatAmount(
            Number(body.amount),
          )} ${body.symbol} for ${formatUsd(Number(body.total))}.`,
        });
      } else if (body.filledImmediately) {
        setStatus({
          kind: "ok",
          message: `The market had already passed your limit, so it filled at ${formatUsd(
            Number(body.order.fillPrice),
          )}.`,
        });
      } else {
        setStatus({
          kind: "ok",
          message: `Order resting: ${body.order.side === "BUY" ? "buy" : "sell"} ${formatAmount(
            body.order.amount,
          )} ${body.order.symbol} at ${formatUsd(body.order.limitPrice)}.`,
        });
      }

      reset();
      onTraded();
    } catch (error) {
      console.error("Order failed:", error);
      setStatus({ kind: "error", message: "The order could not be sent." });
    } finally {
      setSubmitting(false);
    }
  };

  const setFraction = (fraction: number) => {
    if (side === "BUY") {
      if (!balanceUSD || workingPrice <= 0) return;
      setAmount(trim((balanceUSD * fraction) / workingPrice));
    } else {
      if (!holdingAmount) return;
      setAmount(trim(holdingAmount * fraction));
    }
  };

  return (
    <div className="bg-surface rounded-lg border border-line overflow-hidden">
      <div className="flex border-b border-line" role="tablist" aria-label="Order side">
        {(["BUY", "SELL"] as const).map((option) => (
          <button
            key={option}
            role="tab"
            type="button"
            aria-selected={side === option}
            onClick={() => {
              setSide(option);
              setStatus(null);
            }}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              side === option
                ? "border-b-2 border-ink text-ink"
                : "text-ink-muted hover:text-ink-body"
            }`}
          >
            {option === "BUY" ? "Buy" : "Sell"} {ticker}
          </button>
        ))}
      </div>

      <div className="p-6">
        <div
          className="mb-5 inline-flex rounded-md bg-surface-raised p-0.5"
          role="tablist"
          aria-label="Order type"
        >
          {(
            [
              ["MARKET", "Market"],
              ["LIMIT", "Limit"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={type === value}
              onClick={() => {
                setType(value);
                setStatus(null);
              }}
              className={`press rounded px-3 py-1.5 text-xs font-medium ${
                type === value ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-baseline justify-between mb-4 text-sm">
          <span className="text-ink-muted">
            {side === "BUY" ? "Available balance" : `${ticker} held`}
          </span>
          <span className="font-mono font-medium" data-numeric>
            {side === "BUY"
              ? balanceUSD === null
                ? "—"
                : formatUsd(balanceUSD)
              : formatAmount(holdingAmount)}
          </span>
        </div>

        <div className="mb-2">
          <label htmlFor="amount" className="block text-sm font-medium text-ink-body mb-1">
            Amount ({ticker})
          </label>
          <input
            type="number"
            id="amount"
            min="0"
            step="any"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setStatus(null);
            }}
            placeholder="0.00"
            className={FIELD}
            data-numeric
          />
        </div>

        <div className="flex gap-2 mb-4">
          {[0.25, 0.5, 1].map((fraction) => (
            <button
              key={fraction}
              type="button"
              onClick={() => setFraction(fraction)}
              className="press font-mono text-xs px-2.5 py-1 rounded-md bg-surface-raised text-ink-body hover:bg-line-strong"
            >
              {fraction === 1 ? "Max" : `${fraction * 100}%`}
            </button>
          ))}
        </div>

        {type === "LIMIT" && (
          <div className="mb-4">
            <label htmlFor="limit-price" className="block text-sm font-medium text-ink-body mb-1">
              Limit price (USD)
            </label>
            <input
              type="number"
              id="limit-price"
              min="0"
              step="any"
              inputMode="decimal"
              value={limitPrice}
              onChange={(e) => {
                setLimitTouched(true);
                setLimitPrice(e.target.value);
                setStatus(null);
              }}
              placeholder="0.00"
              className={FIELD}
              data-numeric
            />
            <p className="mt-1 text-xs text-ink-muted">
              {limitGapPct === null ? (
                <>Fills only at this price or better.</>
              ) : (
                <>
                  <span className={`font-mono ${signalTextClass(limitGapPct)}`} data-numeric>
                    {formatPercent(limitGapPct)}
                  </span>{" "}
                  from the market.{" "}
                  {side === "BUY"
                    ? limitGapPct >= 0
                      ? "The market is already there, so this fills now."
                      : "Rests until the price falls to it."
                    : limitGapPct <= 0
                      ? "The market is already there, so this fills now."
                      : "Rests until the price rises to it."}
                </>
              )}
            </p>
          </div>
        )}

        <div className="mb-4">
          <span className="block text-sm font-medium text-ink-body mb-1">
            {type === "LIMIT"
              ? side === "BUY"
                ? "Cash reserved"
                : "Proceeds at the limit"
              : side === "BUY"
                ? "Estimated cost"
                : "Estimated proceeds"}
          </span>
          <div
            className="w-full p-3 border border-line-strong rounded-md bg-surface-raised text-sm font-mono"
            data-numeric
          >
            {estimatedCost > 0 ? formatUsd(estimatedCost) : "—"}
          </div>
          {price > 0 && (
            <p className="text-xs text-ink-muted mt-1 font-mono" data-numeric>
              1 {ticker} = {formatUsd(price)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!validAmount || Boolean(blocker) || submitting || Boolean(unavailable)}
          className="press w-full py-3 px-4 font-medium rounded-md bg-ink text-ink-inverse hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Placing order…"
            : type === "LIMIT"
              ? `Place ${side === "BUY" ? "buy" : "sell"} limit`
              : `${side === "BUY" ? "Buy" : "Sell"} ${ticker}`}
        </button>

        {/* One message slot. Blockers are shown before submission, the server's
            answer after it. */}
        {(unavailable || blocker || status) && (
          <p
            role="status"
            className={`mt-4 text-sm text-center ${
              status?.kind === "ok" ? "text-up" : "text-down"
            }`}
          >
            {unavailable ?? status?.message ?? blocker}
          </p>
        )}

        <p className="mt-4 text-xs text-ink-muted text-center">
          {type === "LIMIT"
            ? "Simulated order. The cash or tokens behind it are held aside until it fills or you cancel."
            : "Simulated order. No real funds move and nothing reaches an exchange."}
        </p>
      </div>
    </div>
  );
};

export default OrderPanel;
