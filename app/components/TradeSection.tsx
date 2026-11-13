"use client";

import { useCallback, useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/nextjs";
import OrderPanel from "./OrderPanel";
import OpenOrders from "./OpenOrders";
import Portfolio from "./Portfolio";
import type { Portfolio as PortfolioData, Position } from "@/app/lib/portfolio";

/**
 * Owns the account state shared by the order ticket and the position card.
 *
 * Both need to update the moment an order fills, so the fetch lives here and
 * the result is passed down rather than each component polling separately.
 */
interface TradeSectionProps {
  coinId: string;
  symbol: string;
  price: number;
}

export default function TradeSection({ coinId, symbol, price }: TradeSectionProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Bumped after a fill so the orders list re-reads rather than showing an
  // order that has already settled.
  const [ordersKey, setOrdersKey] = useState(0);

  const load = useCallback(async () => {
    if (!isSignedIn) return;

    setLoading(true);
    try {
      const res = await fetch("/api/portfolio");

      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        setUnavailable(body.error ?? "The database is unavailable.");
        return;
      }

      if (!res.ok) return;

      setUnavailable(null);
      setPortfolio(await res.json());
    } catch (error) {
      console.error("Could not load portfolio:", error);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  const afterTrade = useCallback(() => {
    load();
    setOrdersKey((key) => key + 1);
  }, [load]);

  useEffect(() => {
    if (isLoaded && isSignedIn) load();
  }, [isLoaded, isSignedIn, load]);

  const position: Position | null =
    portfolio?.positions.find((p) => p.symbol === symbol.toUpperCase()) ?? null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <div className="md:col-span-2">
        <SignedIn>
          <OrderPanel
            coinId={coinId}
            symbol={symbol}
            price={price}
            balanceUSD={portfolio?.balanceUSD ?? null}
            holdingAmount={position?.amount ?? 0}
            unavailable={unavailable}
            onTraded={afterTrade}
          />
        </SignedIn>

        <SignedOut>
          <div className="bg-surface rounded-lg border border-line p-8 text-center">
            <h2 className="text-lg font-medium">Sign in to trade {symbol || "this coin"}</h2>
            <p className="mt-2 text-sm text-ink-muted max-w-sm mx-auto">
              Every new account starts with $5,000 of virtual balance. No card,
              no deposit.
            </p>
            <SignInButton mode="modal">
              <button className="press mt-6 rounded-md bg-ink px-6 py-3 font-medium text-ink-inverse hover:opacity-90">
                Sign in to trade
              </button>
            </SignInButton>
          </div>
        </SignedOut>
      </div>

      <div>
        <Portfolio
          symbol={symbol}
          position={position}
          signedIn={Boolean(isSignedIn)}
          loading={loading}
          unavailable={unavailable}
        />
      </div>

      <SignedIn>
        <section className="md:col-span-3 rounded-lg border border-line bg-surface p-6">
          <h2 className="text-lg font-medium">
            Your {symbol || "coin"} orders
          </h2>
          <div className="mt-4">
            <OpenOrders coinId={coinId} refreshKey={ordersKey} onChanged={load} />
          </div>
        </section>
      </SignedIn>
    </div>
  );
}
