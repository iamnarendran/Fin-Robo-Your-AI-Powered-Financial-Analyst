import Link from "next/link";
import type { Quote } from "@/lib/types";
import { cn, formatChange, formatNumber, trendClass } from "@/lib/utils";
import { ChangePill } from "./change-pill";
import { Sparkline } from "./sparkline";

export function IndexCard({ quote, spark }: { quote: Quote; spark: number[] }) {
  return (
    <Link
      href={`/stock/${encodeURIComponent(quote.symbol)}`}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-ring/60 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{quote.name}</span>
        <ChangePill value={quote.changePercent} />
      </div>
      <div>
        <div className="text-xl font-semibold tracking-tight tabular">
          {formatNumber(quote.price, 2, quote.currency)}
        </div>
        <div className={cn("text-xs tabular", trendClass(quote.change))}>{formatChange(quote.change)} today</div>
      </div>
      <Sparkline values={spark} />
    </Link>
  );
}

export function IndexCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex justify-between">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-4 w-12" />
      </div>
      <div className="skeleton h-6 w-28" />
      <div className="skeleton h-10 w-full" />
    </div>
  );
}
