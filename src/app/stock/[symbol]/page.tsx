import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChangePill } from "@/components/market/change-pill";
import { PriceChart } from "@/components/market/price-chart";
import { CompanyProfile, KeyStats, PerformanceCard } from "@/components/market/stock-panels";
import { summarize } from "@/lib/indicators";
import { getHistory, getProfile, getQuote, safe } from "@/lib/market-data";
import { displaySymbol, isIndianSymbol } from "@/lib/markets";
import { cn, formatChange, formatPrice, trendClass } from "@/lib/utils";

type Props = { params: Promise<{ symbol: string }> };

function parseSymbol(raw: string) {
  return decodeURIComponent(raw).trim().toUpperCase();
}

function exchangeTimeZone(symbol: string) {
  if (isIndianSymbol(symbol) || symbol === "INR=X") return "Asia/Kolkata";
  if (symbol.endsWith("-USD")) return "UTC";
  return "America/New_York";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const symbol = parseSymbol((await params).symbol);
  return { title: `${displaySymbol(symbol)} stock price, chart & analysis` };
}

export default function StockPage({ params }: Props) {
  return (
    <Suspense fallback={<StockSkeleton />}>
      <StockView params={params} />
    </Suspense>
  );
}

async function StockView({ params }: Props) {
  const symbol = parseSymbol((await params).symbol);
  const [quote, chartCandles, yearCandles, profile] = await Promise.all([
    safe(getQuote(symbol), null),
    safe(getHistory(symbol, "6mo"), []),
    safe(getHistory(symbol, "1y"), []),
    safe(getProfile(symbol), null),
  ]);

  if (!quote || quote.price == null) notFound();

  const performance = summarize(yearCandles);
  const isMarketOpen = quote.marketState === "REGULAR";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded border px-1.5 py-0.5 font-medium text-foreground">{displaySymbol(symbol)}</span>
            <span>{quote.exchange}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", isMarketOpen ? "bg-up" : "bg-muted-foreground/40")} />
              {isMarketOpen ? "Market open" : "Market closed"}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{quote.name}</h1>
          <Link
            href={`/ask?symbol=${encodeURIComponent(symbol)}&q=${encodeURIComponent(`Analyse ${quote.name} (${symbol})`)}`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-ring"
          >
            <Sparkles className="size-3.5 text-brand" aria-hidden="true" />
            Ask Fin-Robo about {displaySymbol(symbol)}
          </Link>
        </div>
        <div className="sm:text-right">
          <div className="text-3xl font-semibold tracking-tight tabular">{formatPrice(quote.price, quote.currency)}</div>
          <div className="flex items-center gap-2 sm:justify-end">
            <span className={cn("text-sm tabular", trendClass(quote.change))}>{formatChange(quote.change)}</span>
            <ChangePill value={quote.changePercent} />
            <span className="text-xs text-muted-foreground">today</span>
          </div>
        </div>
      </header>

      <PriceChart
        symbol={symbol}
        currency={quote.currency}
        timeZone={exchangeTimeZone(symbol)}
        initialRange="6mo"
        initialCandles={chartCandles}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <KeyStats quote={quote} />
        <PerformanceCard performance={performance} currency={quote.currency} />
        <CompanyProfile profile={profile} />
      </div>
    </div>
  );
}

function StockSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-8 w-64" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-8 w-36" />
          <div className="skeleton h-4 w-24" />
        </div>
      </div>
      <div className="skeleton h-[400px] w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
