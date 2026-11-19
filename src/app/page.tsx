import { connection } from "next/server";
import { Suspense } from "react";
import { BriefCard, BriefCardSkeleton } from "@/components/brief/brief-view";
import { AskBox } from "@/components/chat/ask-box";
import { IndexCard, IndexCardSkeleton } from "@/components/market/index-card";
import { QuoteTable, QuoteTableSkeleton } from "@/components/market/quote-table";
import { getDailyBrief } from "@/lib/brief";
import { getQuotes, getSparkline, safe } from "@/lib/market-data";
import { GLOBAL_MARKETS, INDIA_INDICES, NIFTY_50, POPULAR_US, type Instrument } from "@/lib/markets";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Markets today</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Indian markets first, with the global cues that move them. Press{" "}
          <kbd className="rounded border bg-muted px-1.5 font-mono text-xs">⌘K</kbd> to look up any stock.
        </p>
      </div>

      <Suspense fallback={<BriefCardSkeleton />}>
        <TodaysBrief />
      </Suspense>

      <AskBox />

      <Section title="India" description="NSE and BSE benchmark indices">
        <Suspense fallback={<CardGridSkeleton count={4} />}>
          <IndexGrid instruments={INDIA_INDICES} />
        </Suspense>
      </Section>

      <Section title="Global cues" description="US indices, currency, commodities and crypto">
        <Suspense fallback={<CardGridSkeleton count={6} />}>
          <IndexGrid instruments={GLOBAL_MARKETS} />
        </Suspense>
      </Section>

      <Section title="NIFTY 50 movers" description="Biggest moves among India's top 50 companies today">
        <Suspense
          fallback={
            <div className="grid gap-4 lg:grid-cols-3">
              <QuoteTableSkeleton title="Top gainers" />
              <QuoteTableSkeleton title="Top losers" />
              <QuoteTableSkeleton title="Most active" />
            </div>
          }
        >
          <NiftyMovers />
        </Suspense>
      </Section>

      <Section title="Popular in the US" description="Large-cap names Indian investors follow most">
        <Suspense fallback={<QuoteTableSkeleton title="US large caps" rows={8} />}>
          <UsPopular />
        </Suspense>
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function CardGridSkeleton({ count }: { count: number }) {
  return (
    <div className={count > 4 ? "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" : "grid grid-cols-2 gap-3 lg:grid-cols-4"}>
      {Array.from({ length: count }, (_, i) => (
        <IndexCardSkeleton key={i} />
      ))}
    </div>
  );
}

/*
 * Each section calls connection() so it renders at request time instead of at
 * build time: a Yahoo outage or block during `next build` must never fail a
 * deploy. Data is still cached by "use cache" in market-data.ts.
 */
async function IndexGrid({ instruments }: { instruments: Instrument[] }) {
  await connection();
  const symbols = instruments.map((i) => i.symbol);
  const [quotes, sparks] = await Promise.all([
    safe(getQuotes(symbols), []),
    Promise.all(symbols.map((s) => safe(getSparkline(s), []))),
  ]);

  if (quotes.length === 0) return <Unavailable />;

  const sparkBySymbol = new Map(symbols.map((s, i) => [s, sparks[i]]));
  return (
    <div className={instruments.length > 4 ? "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" : "grid grid-cols-2 gap-3 lg:grid-cols-4"}>
      {quotes.map((q) => (
        <IndexCard key={q.symbol} quote={q} spark={sparkBySymbol.get(q.symbol) ?? []} />
      ))}
    </div>
  );
}

async function TodaysBrief() {
  await connection();
  const brief = await safe(getDailyBrief(), null);
  return brief ? <BriefCard brief={brief} /> : null;
}

async function NiftyMovers() {
  await connection();
  const quotes = (await safe(getQuotes(NIFTY_50.map((i) => i.symbol)), [])).filter((q) => q.changePercent != null);
  if (quotes.length === 0) return <Unavailable />;

  const byChange = [...quotes].sort((a, b) => b.changePercent! - a.changePercent!);
  const gainers = byChange.filter((q) => q.changePercent! > 0).slice(0, 5);
  const losers = byChange.filter((q) => q.changePercent! < 0).reverse().slice(0, 5);
  const active = [...quotes]
    .sort((a, b) => (b.volume ?? 0) * (b.price ?? 0) - (a.volume ?? 0) * (a.price ?? 0))
    .slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <QuoteTable title="Top gainers" quotes={gainers} empty="No gainers today." />
      <QuoteTable title="Top losers" quotes={losers} empty="No losers today." />
      <QuoteTable title="Most active" quotes={active} />
    </div>
  );
}

async function UsPopular() {
  await connection();
  const quotes = await safe(getQuotes(POPULAR_US.map((i) => i.symbol)), []);
  if (quotes.length === 0) return <Unavailable />;
  return <QuoteTable title="US large caps" quotes={quotes} />;
}

function Unavailable() {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      Market data is temporarily unavailable. Please try again in a minute.
    </div>
  );
}
