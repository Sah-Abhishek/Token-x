"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CHART_RANGES, type ChartRange, type Series } from "@/app/lib/market";
import { formatUsd, formatPercent } from "@/app/lib/format";

/**
 * The live price chart that opens the page.
 *
 * It is seeded with a server-rendered series so the first paint already shows
 * real data, then re-fetches from our cached /api/series when the reader picks
 * a different range. One series, so no legend: the heading names the pair.
 */

const VIEW_W = 1000;
const VIEW_H = 320;
const PAD_Y = 18;

const RANGES = Object.keys(CHART_RANGES) as ChartRange[];

interface HeroChartProps {
  initial: Series;
}

type Geometry = {
  line: string;
  area: string;
  xs: number[];
  ys: number[];
};

function buildGeometry(series: Series): Geometry {
  const { points, min, max } = series;
  // Price charts are read for shape, not magnitude from zero, so the domain
  // hugs the data with a little headroom instead of starting at 0.
  const span = max - min || 1;
  const lo = min - span * 0.08;
  const hi = max + span * 0.08;

  const xs: number[] = [];
  const ys: number[] = [];

  points.forEach((point, i) => {
    xs.push((i / (points.length - 1)) * VIEW_W);
    ys.push(
      PAD_Y + (1 - (point.c - lo) / (hi - lo)) * (VIEW_H - PAD_Y * 2),
    );
  });

  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${ys[i].toFixed(2)}`).join(" ");
  const area = `${line} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`;

  return { line, area, xs, ys };
}

export default function HeroChart({ initial }: HeroChartProps) {
  const [series, setSeries] = useState<Series>(initial);
  // `pending` is the range being fetched. The *selected* range is always
  // series.range, so a failed fetch can never leave the control showing one
  // range while the plot shows another.
  const [pending, setPending] = useState<ChartRange | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [tick, setTick] = useState<"up" | "down" | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const lineRef = useRef<SVGPathElement | null>(null);
  const gradientId = useId();

  const geo = buildGeometry(series);
  const positive = series.change >= 0;
  const signal = positive ? "var(--color-up)" : "var(--color-down)";

  // Measure the path so the draw-in animation retracts exactly its own length.
  // Runs once: the reveal is the page's single load moment, not a per-update
  // effect that would re-animate every time someone switches range.
  useEffect(() => {
    const path = lineRef.current;
    if (!path || drawn) return;

    const length = path.getTotalLength();
    path.style.setProperty("--len", String(length));
    path.style.strokeDasharray = String(length);
    setDrawn(true);
  }, [drawn]);

  // The headline price tracks the live ticker, so the number at the top of
  // the page is current even though the series behind it is cached. A brief
  // tint on change is state indication, not decoration: it shows which way
  // the price just moved.
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch("/api/ticker", { signal: controller.signal });
        if (!res.ok) return;

        const tickers: { symbol: string; price: number }[] = await res.json();
        const btc = tickers.find((t) => t.symbol === "BTC");
        if (!btc) return;

        setLivePrice((previous) => {
          if (previous !== null && btc.price !== previous) {
            setTick(btc.price > previous ? "up" : "down");
            window.setTimeout(() => setTick(null), 600);
          }
          return btc.price;
        });
      } catch {
        // A failed poll is not worth surfacing; the cached price still shows.
      }
    };

    const schedule = () => {
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") await poll();
        schedule();
      }, 30_000);
    };

    poll();
    schedule();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const range = series.range;
  const loading = pending !== null;

  const pickRange = async (next: ChartRange) => {
    if (next === range || loading) return;

    setPending(next);
    setFailed(false);
    setHover(null);

    try {
      const res = await fetch(`/api/series?symbol=BTC&range=${next}`);
      if (!res.ok) throw new Error(`Series request failed: ${res.status}`);
      setSeries(await res.json());
    } catch (error) {
      // The upstream exchange rate-limits bursts, so this is expected
      // occasionally. Say so rather than leaving the old plot in place
      // under a new label.
      console.error("Failed to load series:", error);
      setFailed(true);
    } finally {
      setPending(null);
    }
  };

  /** Map a pointer position to the nearest data index. Works under
   *  preserveAspectRatio="none" because both axes map linearly. */
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;

    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (series.points.length - 1));
    setHover(Math.max(0, Math.min(series.points.length - 1, index)));
  };

  const active = hover === null ? null : series.points[hover];
  const shownPrice = active ? active.c : (livePrice ?? series.last);

  const timeLabel = (ms: number) =>
    new Date(ms).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      // 24H, 7D and 30D all carry several points per day, so the time of
      // day is what distinguishes them.
      ...(range === "1Y" ? {} : { hour: "numeric", minute: "2-digit" }),
    });

  return (
    <figure className="m-0 rounded-xl border border-line bg-surface overflow-hidden">
      <figcaption className="flex flex-wrap items-start justify-between gap-4 p-5 pb-4">
        <div>
          <h2 className="font-mono text-xs text-ink-muted mb-2">BTC / USDT</h2>
          <div className="flex items-baseline gap-3">
            <span
              className="font-mono text-3xl md:text-4xl font-medium tracking-tight"
              style={{
                color: tick === "up" ? "var(--color-up)" : tick === "down" ? "var(--color-down)" : undefined,
                transition: "color 600ms ease",
              }}
              data-numeric
            >
              {formatUsd(shownPrice)}
            </span>
            {/* Signal colour plus an explicit sign, so direction is never
                carried by colour alone. */}
            <span
              className="font-mono text-sm font-medium"
              style={{ color: signal }}
              data-numeric
            >
              {formatPercent(series.change)}
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-2 h-4">
            {active
              ? timeLabel(active.t)
              : failed
                ? "That range did not load. Pick it again to retry."
                : "Binance spot price, checked every 30 seconds"}
          </p>
        </div>

        <div className="flex gap-1" role="group" aria-label="Chart range">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => pickRange(option)}
              aria-pressed={option === range}
              aria-busy={option === pending}
              disabled={loading}
              className={`font-mono text-xs px-2.5 py-1.5 rounded-md press ${
                option === range
                  ? "bg-ink text-ink-inverse"
                  : option === pending
                    ? "text-ink animate-pulse-subtle"
                    : "text-ink-muted hover:bg-surface-raised hover:text-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </figcaption>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className={`block w-full h-[240px] md:h-[340px] touch-none ${loading ? "opacity-60" : ""}`}
          style={{ transition: "opacity 200ms var(--ease-out-strong)" }}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`Bitcoin price against USDT over the last ${range}, ${formatPercent(series.change)}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={signal} stopOpacity="0.16" />
              <stop offset="100%" stopColor={signal} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Recessive grid. Four lines is enough to read level against. */}
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1="0"
              x2={VIEW_W}
              y1={PAD_Y + fraction * (VIEW_H - PAD_Y * 2)}
              y2={PAD_Y + fraction * (VIEW_H - PAD_Y * 2)}
              stroke="var(--color-line)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={geo.area} fill={`url(#${gradientId})`} className="animate-area" />

          <path
            ref={lineRef}
            d={geo.line}
            fill="none"
            stroke={signal}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="animate-draw"
          />

          {hover !== null && (
            <g>
              <line
                x1={geo.xs[hover]}
                x2={geo.xs[hover]}
                y1={PAD_Y}
                y2={VIEW_H - PAD_Y}
                stroke="var(--color-line-strong)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              {/* A surface ring keeps the marker legible over the area fill. */}
              <circle
                cx={geo.xs[hover]}
                cy={geo.ys[hover]}
                r="5"
                fill={signal}
                stroke="var(--color-surface)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>

        {/* Tooltip lives in HTML, not SVG, so it is not stretched by
            preserveAspectRatio="none". */}
        {active && (
          <div
            className="pointer-events-none absolute top-3 rounded-md border border-line bg-surface px-2.5 py-1.5 shadow-sm"
            style={{
              left: `${(geo.xs[hover!] / VIEW_W) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-mono text-sm font-medium text-ink" data-numeric>
              {formatUsd(active.c)}
            </div>
            <div className="font-mono text-[10px] text-ink-muted" data-numeric>
              {timeLabel(active.t)}
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}
