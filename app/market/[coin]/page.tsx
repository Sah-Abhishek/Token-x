"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import MarketInfo from "@/app/components/Marketinfo";
import WatchButton from "@/app/components/WatchButton";
import TradeSection from "@/app/components/TradeSection";
import CandleChart from "@/app/components/CandleChart";
import PriceChart from "@/app/components/PriceChart";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import type { CoinDetail } from "@/app/lib/market";
import { formatUsd, formatPercent, signalClasses } from "@/app/lib/format";

type ChartKind = "candlestick" | "line";

const CoinPage: React.FC = () => {
  const params = useParams<{ coin?: string }>();
  // The CoinGecko id is already lower-cased and hyphenated in the URL; the
  // old code upper-cased it and then lower-cased it again on every fetch.
  const coinId = params?.coin ? decodeURIComponent(params.coin) : "";

  const [selectedChart, setSelectedChart] = useState<ChartKind>("candlestick");
  const [coinData, setCoinData] = useState<CoinDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!coinId) return;

    const controller = new AbortController();

    const fetchMarketData = async () => {
      setLoading(true);
      setNotFound(false);

      try {
        // Goes through our cached route rather than calling CoinGecko from
        // the browser, which previously burned a rate-limit slot per visitor.
        const res = await fetch(`/api/coin/${encodeURIComponent(coinId)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          setCoinData(null);
          setNotFound(true);
          return;
        }

        setCoinData(await res.json());
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Error fetching market data:", error);
          setNotFound(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchMarketData();
    return () => controller.abort();
  }, [coinId]);

  useEffect(() => {
    const saved = localStorage.getItem("selectedChart");
    if (saved === "candlestick" || saved === "line") setSelectedChart(saved);
  }, []);

  const handleChartSelection = (chartType: string) => {
    const kind: ChartKind = chartType === "line" ? "line" : "candlestick";
    setSelectedChart(kind);
    localStorage.setItem("selectedChart", kind);
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-surface-sunken text-ink flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center animate-fade-in">
            <h1 className="text-2xl font-bold mb-2">We couldn&apos;t find that coin</h1>
            <p className="text-ink-muted mb-6">
              {coinId ? (
                <>
                  No market data for <span className="font-medium">{coinId}</span>.
                </>
              ) : (
                "No coin was specified."
              )}
            </p>
            <Link
              href="/market"
              className="inline-block bg-ink text-ink-inverse px-6 py-3 rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              Browse the market
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="text-ink min-h-screen bg-surface-sunken">
      <Navbar />

      <div className="shell py-8">
        <header className="mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Image
                  src={coinData?.image || "/default-coin.png"}
                  alt=""
                  height={40}
                  width={40}
                  className="rounded-full"
                />
                <h1 className="text-2xl font-bold">
                  {coinData?.name ?? (loading ? "Loading…" : coinId)}
                  {coinData?.symbol && (
                    <span className="text-ink-muted ml-1 font-normal">
                      ({coinData.symbol.toUpperCase()})
                    </span>
                  )}
                </h1>
              </div>

              <div className="flex items-center mt-1">
                {loading ? (
                  <span className="text-lg text-ink-muted animate-pulse-subtle">
                    Fetching price…
                  </span>
                ) : (
                  <>
                    <span className="text-3xl font-semibold mr-3" data-numeric>
                      {formatUsd(coinData?.price)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-sm font-medium ${signalClasses(coinData?.change)}`}
                      data-numeric
                    >
                      {formatPercent(coinData?.change)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <WatchButton coinId={coinId} />
            </div>
          </div>
        </header>

        <MarketInfo coinData={coinData} />

        <div>
          {selectedChart === "candlestick" ? (
            <CandleChart
              symbol={coinData?.symbol ?? ""}
              handleChartSelection={handleChartSelection}
              selectedChart={selectedChart}
            />
          ) : (
            <PriceChart
              symbol={coinData?.symbol ?? ""}
              handleChartSelection={handleChartSelection}
              selectedChart={selectedChart}
            />
          )}
        </div>

        <TradeSection
          coinId={coinId}
          symbol={coinData?.symbol?.toUpperCase() ?? ""}
          price={coinData?.price ?? 0}
        />
      </div>

      <Footer />
    </div>
  );
};

export default CoinPage;
