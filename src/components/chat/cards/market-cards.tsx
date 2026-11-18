import Link from "next/link";
import { ChangePill } from "@/components/market/change-pill";
import type { ToolOutput } from "@/lib/ai/types";
import { displaySymbol } from "@/lib/markets";
import { formatNumber, formatPrice } from "@/lib/utils";
import { CardShell } from "./card-shell";

type CompactQuote = ToolOutput<"getQuotes">["quotes"][number];

function QuoteTile({ q, price = "currency" }: { q: CompactQuote; price?: "currency" | "level" }) {
  return (
    <Link
      href={`/stock/${encodeURIComponent(q.symbol)}`}
      className="flex flex-col gap-1 rounded-lg bg-muted/60 px-3 py-2 transition-colors hover:bg-muted"
    >
      <span className="truncate text-xs text-muted-foreground">{q.name}</span>
      <span className="text-sm font-medium tabular">
        {price === "level" ? formatNumber(q.price, 2, q.currency) : formatPrice(q.price, q.currency)}
      </span>
      <ChangePill value={q.changePercent} className="self-start" />
    </Link>
  );
}

export function QuotesCard({ data }: { data: ToolOutput<"getQuotes"> }) {
  return (
    <CardShell title="Latest prices" subtitle="May be delayed">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.quotes.map((q) => (
          <QuoteTile key={q.symbol} q={q} />
        ))}
      </div>
    </CardShell>
  );
}

function MoverList({ title, quotes }: { title: string; quotes: CompactQuote[] }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{title}</div>
      <ul className="divide-y rounded-lg border">
        {quotes.map((q) => (
          <li key={q.symbol}>
            <Link href={`/stock/${encodeURIComponent(q.symbol)}`} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-muted/60">
              <span className="font-medium">{displaySymbol(q.symbol)}</span>
              <ChangePill value={q.changePercent} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketSnapshotCard({ data }: { data: ToolOutput<"getMarketOverview"> }) {
  const total = data.breadth.advancing + data.breadth.declining || 1;
  const advPct = (data.breadth.advancing / total) * 100;

  return (
    <CardShell title="Market snapshot" subtitle="India first, with global cues">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.indices.map((q) => (
          <QuoteTile key={q.symbol} q={q} price="level" />
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-up">{data.breadth.advancing} advancing</span>
          <span className="text-muted-foreground">NIFTY 50 breadth</span>
          <span className="text-down">{data.breadth.declining} declining</span>
        </div>
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${data.breadth.advancing} advancing, ${data.breadth.declining} declining`}>
          <div className="rounded-l-full bg-up" style={{ width: `${advPct}%` }} />
          <div className="flex-1 rounded-r-full bg-down" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MoverList title="Top gainers" quotes={data.gainers} />
        <MoverList title="Top losers" quotes={data.losers} />
      </div>

      <div className="mt-4 border-t pt-3">
        <div className="mb-2 text-xs text-muted-foreground">Global cues</div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {data.global.map((q) => (
            <span key={q.symbol} className="inline-flex items-center gap-1.5">
              <span className="text-muted-foreground">{q.name}</span>
              <ChangePill value={q.changePercent} />
            </span>
          ))}
        </div>
      </div>
    </CardShell>
  );
}
