import { GraduationCap } from "lucide-react";
import Link from "next/link";
import type { Quote } from "@/lib/types";
import { displaySymbol } from "@/lib/markets";
import { formatCompact, formatNumber, formatPercent, formatPrice } from "@/lib/utils";

type Props = {
  concept?: string;
  summary?: string;
  keyPoints?: (string | undefined)[];
  example?: Quote | null;
  streaming?: boolean;
};

/** Renders progressively while the model is still writing the tool input. */
export function ExplainerCard({ concept, summary, keyPoints, example, streaming }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <GraduationCap className="size-4" aria-hidden="true" />
        </span>
        <div>
          <div className="text-xs text-muted-foreground">Explainer</div>
          <h3 className="text-sm font-medium">{concept || "…"}</h3>
        </div>
      </header>
      <div className="space-y-3 p-4">
        {summary ? <p className="text-sm leading-relaxed">{summary}</p> : <div className="skeleton h-10 w-full" />}
        {keyPoints && keyPoints.length > 0 && (
          <ul className="space-y-2">
            {keyPoints.filter(Boolean).map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        )}
        {streaming && !example && <div className="skeleton h-4 w-2/3" />}
        {example && (
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Live example</span>
              <Link href={`/stock/${encodeURIComponent(example.symbol)}`} className="font-medium text-foreground hover:underline">
                {example.name} ({displaySymbol(example.symbol)})
              </Link>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              {[
                ["Price", formatPrice(example.price, example.currency)],
                ["P/E", formatNumber(example.pe)],
                ["EPS", formatPrice(example.eps, example.currency)],
                ["Market cap", formatCompact(example.marketCap, example.currency)],
                ...(example.dividendYield ? [["Div. yield", formatPercent(example.dividendYield, 2, false)]] : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] text-muted-foreground">{k}</dt>
                  <dd className="font-medium tabular">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}
