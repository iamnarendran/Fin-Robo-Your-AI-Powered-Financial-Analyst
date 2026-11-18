"use client";

import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { RANGES, type Candle, type Range } from "@/lib/types";
import { cn, formatChange, formatNumber, formatPercent, trendClass } from "@/lib/utils";

type Props = {
  symbol: string;
  currency: string;
  timeZone: string;
  initialRange: Range;
  initialCandles: Candle[];
};

/** Resolve any CSS colour (including oklch) to rgba via a 1px canvas. */
function cssVarToRgba(name: string, alpha = 1) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return value;
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Seconds to add so the chart's UTC axis shows exchange-local time. */
function tzOffsetSeconds(timeZone: string, unixSeconds: number) {
  const date = new Date(unixSeconds * 1000);
  const local = new Date(date.toLocaleString("en-US", { timeZone }));
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((local.getTime() - utc.getTime()) / 1000);
}

export function PriceChart({ symbol, currency, timeZone, initialRange, initialCandles }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<"Area"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const { resolvedTheme } = useTheme();

  const [range, setRange] = useState<Range>(initialRange);
  const [candles, setCandles] = useState<Candle[]>(initialCandles);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [hover, setHover] = useState<{ price: number; label: string } | null>(null);

  const intraday = range === "1d" || range === "5d" || range === "1mo";
  const first = candles[0]?.close;
  const last = candles[candles.length - 1]?.close;
  const rangeChange = first != null && last != null ? last - first : null;
  const rangePct = first ? ((last - first) / first) * 100 : null;
  const up = (rangeChange ?? 0) >= 0;

  const offset = useMemo(
    () => (candles.length ? tzOffsetSeconds(timeZone, candles[candles.length - 1].time) : 0),
    [candles, timeZone],
  );

  const intradayRef = useRef(intraday);
  useEffect(() => {
    intradayRef.current = intraday;
  }, [intraday]);

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, fontFamily: "var(--font-geist-sans)", attributionLogo: false },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.22 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: CrosshairMode.Magnet },
      handleScroll: false,
      handleScale: false,
    });
    areaRef.current = chart.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: true });
    volumeRef.current = chart.addSeries(HistogramSeries, { priceScaleId: "volume", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
    chartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      const point = param.seriesData.get(areaRef.current!) as { value?: number } | undefined;
      if (!param.time || point?.value == null) return setHover(null);
      const t = new Date((param.time as number) * 1000);
      const label = t.toLocaleString("en-IN", {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
        ...(intradayRef.current ? { hour: "numeric", minute: "2-digit" } : { year: "numeric" }),
      });
      setHover({ price: point.value, label });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Theme + direction colours.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const accent = up ? "--up" : "--down";
    chart.applyOptions({
      layout: { textColor: cssVarToRgba("--muted-foreground") },
      grid: { vertLines: { visible: false }, horzLines: { color: cssVarToRgba("--chart-grid") } },
      crosshair: {
        vertLine: { color: cssVarToRgba("--ring"), labelBackgroundColor: cssVarToRgba("--primary") },
        horzLine: { color: cssVarToRgba("--ring"), labelBackgroundColor: cssVarToRgba("--primary") },
      },
      timeScale: { timeVisible: intraday, secondsVisible: false },
    });
    areaRef.current?.applyOptions({
      lineColor: cssVarToRgba(accent),
      topColor: cssVarToRgba(accent, 0.22),
      bottomColor: cssVarToRgba(accent, 0),
    });
  }, [resolvedTheme, up, intraday]);

  // Data.
  useEffect(() => {
    const area = areaRef.current;
    const volume = volumeRef.current;
    if (!area || !volume) return;
    area.setData(candles.map((c) => ({ time: (c.time + offset) as UTCTimestamp, value: c.close })));
    const hasVolume = candles.some((c) => c.volume > 0);
    const muted = cssVarToRgba("--muted-foreground", 0.18);
    volume.setData(
      hasVolume ? candles.map((c) => ({ time: (c.time + offset) as UTCTimestamp, value: c.volume, color: muted })) : [],
    );
    // Overlay scales only exist once they hold data; keep volume in the bottom 15%.
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    chartRef.current?.timeScale().fitContent();
  }, [candles, offset, resolvedTheme]);

  async function selectRange(next: Range) {
    if (next === range) return;
    setRange(next);
    setStatus("loading");
    try {
      const res = await fetch(`/api/history?symbol=${encodeURIComponent(symbol)}&range=${next}`);
      if (!res.ok) throw new Error();
      setCandles(await res.json());
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const rangeLabel = RANGES.find((r) => r.value === range)?.label;

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <div className="min-h-10 text-sm">
          {hover ? (
            <>
              <div className="font-medium tabular">{formatNumber(hover.price, 2, currency)}</div>
              <div className="text-xs text-muted-foreground">{hover.label}</div>
            </>
          ) : (
            <>
              <div className={cn("font-medium tabular", trendClass(rangeChange))}>
                {formatChange(rangeChange)} ({formatPercent(rangePct)})
              </div>
              <div className="text-xs text-muted-foreground">Change over {rangeLabel}</div>
            </>
          )}
        </div>
        <div role="tablist" aria-label="Chart range" className="flex rounded-lg bg-muted p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              role="tab"
              aria-selected={range === r.value}
              onClick={() => selectRange(r.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                range === r.value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <div
          ref={containerRef}
          className={cn("h-[340px] w-full transition-opacity sm:h-[400px]", status === "loading" && "opacity-40")}
        />
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Couldn’t load this range. Try another one.
          </div>
        )}
        {candles.length === 0 && status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No price history available.
          </div>
        )}
      </div>
    </div>
  );
}
