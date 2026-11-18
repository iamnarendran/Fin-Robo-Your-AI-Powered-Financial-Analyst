import Link from "next/link";
import { displaySymbol } from "@/lib/markets";
import type { Quote } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ChangePill } from "./change-pill";

export function QuoteTable({ title, quotes, empty }: { title: string; quotes: Quote[]; empty?: string }) {
  return (
    <section className="rounded-xl border bg-card">
      <h3 className="border-b px-4 py-3 text-sm font-medium">{title}</h3>
      {quotes.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{empty ?? "No data right now."}</p>
      ) : (
        <ul className="divide-y">
          {quotes.map((q) => (
            <li key={q.symbol}>
              <Link
                href={`/stock/${encodeURIComponent(q.symbol)}`}
                className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{displaySymbol(q.symbol)}</div>
                  <div className="truncate text-xs text-muted-foreground">{q.name}</div>
                </div>
                <span className="tabular">{formatPrice(q.price, q.currency)}</span>
                <ChangePill value={q.changePercent} className="w-[4.5rem] justify-end" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function QuoteTableSkeleton({ title, rows = 5 }: { title: string; rows?: number }) {
  return (
    <section className="rounded-xl border bg-card">
      <h3 className="border-b px-4 py-3 text-sm font-medium">{title}</h3>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-20" />
              <div className="skeleton h-3 w-32" />
            </div>
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-5 w-14" />
          </div>
        ))}
      </div>
    </section>
  );
}
