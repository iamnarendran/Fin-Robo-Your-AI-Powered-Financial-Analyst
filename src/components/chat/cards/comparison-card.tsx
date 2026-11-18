import Link from "next/link";
import { SeriesChart } from "@/components/charts/series-chart";
import type { ToolOutput } from "@/lib/ai/types";
import { displaySymbol } from "@/lib/markets";
import { cn, formatNumber, formatPercent, formatPrice, trendClass } from "@/lib/utils";
import { CardShell } from "./card-shell";

const RANGE_LABEL: Record<string, string> = { "1mo": "1 month", "6mo": "6 months", "1y": "1 year", "5y": "5 years" };

/** Colour follows the symbol's position in the request, never its rank. */
const colorVar = (i: number) => `--series-${(i % 5) + 1}`;

export function ComparisonCard({ data }: { data: ToolOutput<"compareStocks"> }) {
  const best = Math.max(...data.metrics.map((m) => m.returnPct ?? -Infinity));

  return (
    <CardShell
      title={data.series.map((s) => displaySymbol(s.symbol)).join(" vs ")}
      subtitle={`Performance over ${RANGE_LABEL[data.range] ?? data.range}, rebased to 100`}
    >
      <SeriesChart
        height={210}
        baseline={100}
        format={(v) => v.toFixed(1)}
        series={data.series.map((s, i) => ({ id: s.symbol, label: displaySymbol(s.symbol), colorVar: colorVar(i), points: s.points }))}
      />

      <div className="-mx-4 mt-4 overflow-x-auto border-t">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-normal">Stock</th>
              <th className="px-2 py-2 text-right font-normal">Price</th>
              <th className="px-2 py-2 text-right font-normal">Return</th>
              <th className="px-2 py-2 text-right font-normal">Volatility</th>
              <th className="px-2 py-2 text-right font-normal">Max drawdown</th>
              <th className="px-2 py-2 text-right font-normal">RSI</th>
              <th className="px-4 py-2 text-right font-normal">P/E</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.metrics.map((m, i) => (
              <tr key={m.symbol}>
                <td className="px-4 py-2">
                  <Link href={`/stock/${encodeURIComponent(m.symbol)}`} className="flex items-center gap-2 hover:underline">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: `var(${colorVar(i)})` }} aria-hidden="true" />
                    <span className="font-medium">{displaySymbol(m.symbol)}</span>
                  </Link>
                </td>
                <td className="px-2 py-2 text-right tabular">{formatPrice(m.price, m.currency)}</td>
                <td className={cn("px-2 py-2 text-right font-medium tabular", trendClass(m.returnPct))}>
                  {formatPercent(m.returnPct, 1)}
                  {m.returnPct === best && data.metrics.length > 1 && <span className="sr-only"> (best)</span>}
                </td>
                <td className="px-2 py-2 text-right tabular">{formatPercent(m.volatilityPct, 1, false)}</td>
                <td className="px-2 py-2 text-right tabular">{formatPercent(m.maxDrawdownPct, 1)}</td>
                <td className="px-2 py-2 text-right tabular">{m.rsi14 == null ? "—" : m.rsi14.toFixed(0)}</td>
                <td className="px-4 py-2 text-right tabular">{formatNumber(m.pe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardShell>
  );
}
