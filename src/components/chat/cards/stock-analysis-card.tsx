import { ArrowUpRight, Info } from "lucide-react";
import Link from "next/link";
import { SeriesChart } from "@/components/charts/series-chart";
import { ChangePill } from "@/components/market/change-pill";
import type { ToolOutput } from "@/lib/ai/types";
import { displaySymbol } from "@/lib/markets";
import { cn, formatCompact, formatNumber, formatPercent, formatPrice, trendClass } from "@/lib/utils";
import { CardShell, Metric } from "./card-shell";

export function StockAnalysisCard({ data }: { data: ToolOutput<"analyzeStock"> }) {
  const { quote, performance, signals, series, sector, industry } = data;
  const oneYear = performance.returns.find((r) => r.label === "1Y")?.value ?? null;
  const isEquity = quote.quoteType === "EQUITY";
  const fmt = (v: number) => formatNumber(v, 2, quote.currency);

  return (
    <CardShell
      title={
        <span className="flex items-center gap-2">
          {quote.name}
          <span className="rounded border px-1 text-[10px] font-normal text-muted-foreground">{displaySymbol(quote.symbol)}</span>
        </span>
      }
      subtitle={[sector, industry].filter(Boolean).join(" · ") || quote.exchange}
      action={
        <Link
          href={`/stock/${encodeURIComponent(quote.symbol)}`}
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Full page <ArrowUpRight className="size-3.5" />
        </Link>
      }
    >
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular">{formatPrice(quote.price, quote.currency)}</span>
        <ChangePill value={quote.changePercent} />
        <span className="text-xs text-muted-foreground">today</span>
      </div>

      <div className="mt-1 text-xs text-muted-foreground">
        1-year: <span className={cn("font-medium tabular", trendClass(oneYear))}>{formatPercent(oneYear, 1)}</span>
      </div>

      <SeriesChart
        className="mt-3"
        height={170}
        format={fmt}
        series={[{ id: quote.symbol, label: quote.name, colorVar: (oneYear ?? 0) >= 0 ? "--up" : "--down", points: series }]}
      />

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Volatility (ann.)" value={formatPercent(performance.volatility, 1, false)} />
        <Metric label="Max drawdown" value={formatPercent(performance.maxDrawdown, 1)} />
        <Metric label="RSI (14)" value={performance.rsi14 == null ? "—" : performance.rsi14.toFixed(0)} />
        {isEquity && <Metric label="P/E (TTM)" value={formatNumber(quote.pe)} />}
        {isEquity && <Metric label="Market cap" value={formatCompact(quote.marketCap, quote.currency)} />}
        <Metric
          label="52-week range"
          value={`${formatNumber(quote.fiftyTwoWeekLow, 0, quote.currency)}–${formatNumber(quote.fiftyTwoWeekHigh, 0, quote.currency)}`}
        />
      </div>

      {signals.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t pt-3">
          {signals.map((s) => (
            <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {s}
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}
