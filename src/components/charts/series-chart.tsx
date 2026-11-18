"use client";

import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { cssVarToRgba } from "@/lib/css-color";
import { cn } from "@/lib/utils";

export type ChartSeries = {
  id: string;
  label: string;
  /** CSS custom property, e.g. "--series-1" or "--up". */
  colorVar: string;
  points: { time: number; value: number }[];
};

type Props = {
  series: ChartSeries[];
  /** Single series renders as a filled area; several render as lines. */
  height?: number;
  format: (value: number) => string;
  /** Show a legend that doubles as the hover readout. */
  legend?: boolean;
  baseline?: number;
  /** Up/down arrows on the first series, e.g. unusual moves. Times must exist in its points. */
  markers?: { time: number; up: boolean }[];
  className?: string;
};

/**
 * Compact chart for AI answer cards. One y-axis only: comparisons are
 * rebased to 100 by the tool so different price levels share a scale.
 */
export function SeriesChart({ series, height = 200, format, legend = series.length > 1, baseline, markers, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<ISeriesApi<"Area" | "Line">[]>([]);
  const { resolvedTheme } = useTheme();
  const [hover, setHover] = useState<{ label: string; values: (number | null)[] } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, attributionLogo: false, fontSize: 11 },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.08 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      grid: { vertLines: { visible: false } },
      crosshair: { mode: CrosshairMode.Magnet },
      localization: { priceFormatter: format },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;

    const area = series.length === 1;
    seriesRefs.current = series.map((s) => {
      const api = area
        ? chart.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
        : chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      api.setData(s.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      return api;
    });
    if (markers?.length && seriesRefs.current[0]) {
      const up = cssVarToRgba("--up");
      const down = cssVarToRgba("--down");
      createSeriesMarkers(
        seriesRefs.current[0],
        [...markers]
          .sort((a, b) => a.time - b.time)
          .map((m) => ({
            time: m.time as UTCTimestamp,
            position: m.up ? ("belowBar" as const) : ("aboveBar" as const),
            shape: m.up ? ("arrowUp" as const) : ("arrowDown" as const),
            color: m.up ? up : down,
          })),
      );
    }
    if (baseline != null && seriesRefs.current[0]) {
      seriesRefs.current[0].createPriceLine({ price: baseline, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, color: "rgba(128,128,128,0.5)" });
    }
    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) return setHover(null);
      const values = seriesRefs.current.map((api) => {
        const d = param.seriesData.get(api) as { value?: number } | undefined;
        return d?.value ?? null;
      });
      const label = new Date((param.time as number) * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      setHover({ label, values });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRefs.current = [];
    };
    // Series data is immutable once a tool result has streamed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      layout: { textColor: cssVarToRgba("--muted-foreground") },
      grid: { horzLines: { color: cssVarToRgba("--chart-grid") } },
      crosshair: {
        vertLine: { color: cssVarToRgba("--ring"), labelBackgroundColor: cssVarToRgba("--primary") },
        horzLine: { color: cssVarToRgba("--ring"), labelBackgroundColor: cssVarToRgba("--primary") },
      },
    });
    seriesRefs.current.forEach((api, i) => {
      const color = cssVarToRgba(series[i].colorVar);
      if (series.length === 1) {
        api.applyOptions({ lineColor: color, topColor: cssVarToRgba(series[i].colorVar, 0.2), bottomColor: cssVarToRgba(series[i].colorVar, 0) } as never);
      } else {
        api.applyOptions({ color } as never);
      }
    });
  }, [resolvedTheme, series]);

  const lastValues = series.map((s) => s.points[s.points.length - 1]?.value ?? null);
  const shown = hover?.values ?? lastValues;

  return (
    <div className={cn("space-y-2", className)}>
      {legend && (
        <div className="flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {series.map((s, i) => (
            <span key={s.id} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full" style={{ background: `var(${s.colorVar})` }} aria-hidden="true" />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-medium tabular">{shown[i] == null ? "—" : format(shown[i]!)}</span>
            </span>
          ))}
          <span className="ml-auto text-muted-foreground">{hover?.label ?? "Latest"}</span>
        </div>
      )}
      <div ref={containerRef} style={{ height }} className="w-full" />
    </div>
  );
}
