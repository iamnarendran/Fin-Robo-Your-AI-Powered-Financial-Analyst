import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { SeriesChart } from "@/components/charts/series-chart";
import { ChangePill } from "@/components/market/change-pill";
import { MoveTimeline } from "@/components/market/move-timeline";
import type { ToolOutput } from "@/lib/ai/types";
import { displaySymbol } from "@/lib/markets";
import { formatNumber, formatPrice } from "@/lib/utils";
import { CardShell } from "./card-shell";

export function MoveCard({ data }: { data: ToolOutput<"explainPriceMoves"> }) {
  const { quote, moves, articles, benchmark, series } = data;
  const inChart = new Set(series.map((p) => p.time));
  const markers = moves.filter((m) => m.unusual && inChart.has(m.time)).map((m) => ({ time: m.time, up: m.changePct >= 0 }));

  return (
    <CardShell
      title={
        <span className="flex items-center gap-2">
          Why {quote.name} moved
          <span className="rounded border px-1 text-[10px] font-normal text-muted-foreground">{displaySymbol(quote.symbol)}</span>
        </span>
      }
      subtitle={`Unusual moves in the last month, matched to headlines${benchmark ? ` · compared with ${benchmark.name}` : ""}`}
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
        <span className="text-xl font-semibold tracking-tight tabular">{formatPrice(quote.price, quote.currency)}</span>
        <ChangePill value={quote.changePercent} />
        <span className="text-xs text-muted-foreground">today</span>
      </div>

      <SeriesChart
        className="mt-3"
        height={150}
        format={(v) => formatNumber(v, 2, quote.currency)}
        markers={markers}
        series={[{ id: quote.symbol, label: quote.name, colorVar: "--muted-foreground", points: series }]}
      />

      <div className="mt-4 border-t pt-4">
        {articles.length === 0 && moves.every((m) => m.articleIds.length === 0) ? (
          <p className="text-sm text-muted-foreground">No headlines were found for this period.</p>
        ) : null}
        <MoveTimeline moves={moves} articles={articles} benchmarkName={benchmark?.name} moreHeadlines={4} />
      </div>
    </CardShell>
  );
}
