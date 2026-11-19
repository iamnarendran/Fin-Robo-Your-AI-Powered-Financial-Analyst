import "server-only";

import { cacheLife } from "next/cache";
import YahooFinance from "yahoo-finance2";
import { GLOBAL_MARKETS, INDIA_INDICES, NIFTY_50, knownName } from "./markets";
import { mockHistory, mockProfile, mockQuote, mockSearch } from "./mock-data";
import type { Candle, Profile, Quote, Range, SearchResult } from "./types";

/**
 * Server-side market data layer.
 *
 * Every public function is wrapped in `use cache` so repeated requests for the
 * same symbol hit the in-memory cache instead of Yahoo. Set FINROBO_MOCK=1 to
 * serve deterministic synthetic data (offline development, CI, demos).
 */

const MOCK = process.env.FINROBO_MOCK === "1";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 4 },
});

type Loose = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);

function toQuote(raw: Loose): Quote {
  const symbol = String(raw.symbol);
  return {
    symbol,
    name: knownName(symbol) ?? str(raw.longName) ?? str(raw.shortName) ?? symbol,
    currency: str(raw.currency) ?? "USD",
    exchange: str(raw.fullExchangeName) ?? str(raw.exchange) ?? "",
    quoteType: str(raw.quoteType) ?? "EQUITY",
    marketState: str(raw.marketState) ?? "CLOSED",
    price: num(raw.regularMarketPrice),
    change: num(raw.regularMarketChange),
    changePercent: num(raw.regularMarketChangePercent),
    previousClose: num(raw.regularMarketPreviousClose),
    open: num(raw.regularMarketOpen),
    dayHigh: num(raw.regularMarketDayHigh),
    dayLow: num(raw.regularMarketDayLow),
    volume: num(raw.regularMarketVolume),
    avgVolume: num(raw.averageDailyVolume3Month),
    marketCap: num(raw.marketCap),
    pe: num(raw.trailingPE),
    eps: num(raw.epsTrailingTwelveMonths),
    dividendYield: num(raw.dividendYield),
    fiftyTwoWeekHigh: num(raw.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(raw.fiftyTwoWeekLow),
  };
}

/* ------------------------------------------------------------------ */
/* Quotes                                                              */
/* ------------------------------------------------------------------ */

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  "use cache";
  cacheLife("minutes");

  if (symbols.length === 0) return [];
  if (MOCK) return symbols.map(mockQuote);

  const raw = (await yf.quote(symbols, { return: "array" })) as unknown as Loose[];
  const bySymbol = new Map(raw.map((r) => [String(r.symbol), toQuote(r)]));
  // Preserve the caller's order and drop symbols Yahoo didn't return.
  return symbols.map((s) => bySymbol.get(s)).filter((q): q is Quote => Boolean(q));
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const [quote] = await getQuotes([symbol]);
  return quote ?? null;
}

/* ------------------------------------------------------------------ */
/* Market snapshot                                                     */
/* ------------------------------------------------------------------ */

export type CompactQuote = Pick<Quote, "symbol" | "name" | "currency" | "price" | "change" | "changePercent" | "marketState">;

export const compactQuote = (q: Quote): CompactQuote => ({
  symbol: q.symbol,
  name: q.name,
  currency: q.currency,
  price: q.price,
  change: q.change,
  changePercent: q.changePercent,
  marketState: q.marketState,
});

export type MarketSnapshot = {
  indices: CompactQuote[];
  global: CompactQuote[];
  gainers: CompactQuote[];
  losers: CompactQuote[];
  breadth: { advancing: number; declining: number };
};

/** Indian indices, global cues and NIFTY 50 movers: shared by the AI tool and the daily brief. */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const [indices, global, nifty] = await Promise.all([
    getQuotes(INDIA_INDICES.map((i) => i.symbol)),
    getQuotes(GLOBAL_MARKETS.map((i) => i.symbol)),
    getQuotes(NIFTY_50.map((i) => i.symbol)),
  ]);
  const ranked = nifty.filter((q) => q.changePercent != null).sort((a, b) => b.changePercent! - a.changePercent!);
  return {
    indices: indices.map(compactQuote),
    global: global.map(compactQuote),
    gainers: ranked.filter((q) => q.changePercent! > 0).slice(0, 4).map(compactQuote),
    losers: ranked.filter((q) => q.changePercent! < 0).slice(-4).reverse().map(compactQuote),
    breadth: { advancing: ranked.filter((q) => q.changePercent! > 0).length, declining: ranked.filter((q) => q.changePercent! < 0).length },
  };
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;

const RANGE_CONFIG: Record<Range, { lookbackDays: number; interval: "5m" | "15m" | "1h" | "1d" | "1wk"; keepDays?: number }> = {
  "1d": { lookbackDays: 7, interval: "5m", keepDays: 1 },
  "5d": { lookbackDays: 10, interval: "15m", keepDays: 5 },
  "1mo": { lookbackDays: 31, interval: "1h" },
  "6mo": { lookbackDays: 183, interval: "1d" },
  "1y": { lookbackDays: 366, interval: "1d" },
  "5y": { lookbackDays: 365 * 5 + 2, interval: "1wk" },
};

/** Keep only the last N distinct trading days (for intraday ranges). */
function lastTradingDays(candles: Candle[], days: number) {
  const dayKeys: string[] = [];
  for (const c of candles) {
    const key = new Date(c.time * 1000).toISOString().slice(0, 10);
    if (dayKeys[dayKeys.length - 1] !== key) dayKeys.push(key);
  }
  const cutoff = dayKeys.slice(-days)[0];
  return candles.filter((c) => new Date(c.time * 1000).toISOString().slice(0, 10) >= cutoff);
}

export async function getHistory(symbol: string, range: Range = "6mo"): Promise<Candle[]> {
  "use cache";
  if (range === "1d" || range === "5d") cacheLife("minutes");
  else cacheLife("hours");

  const config = RANGE_CONFIG[range];
  if (MOCK) return mockHistory(symbol, range);

  const result = await yf.chart(symbol, {
    period1: new Date(Date.now() - config.lookbackDays * DAY),
    interval: config.interval,
    return: "array",
  });

  const candles: Candle[] = result.quotes
    .filter((q) => q.close != null)
    .map((q) => ({
      time: Math.floor(new Date(q.date).getTime() / 1000),
      open: q.open ?? q.close!,
      high: q.high ?? q.close!,
      low: q.low ?? q.close!,
      close: q.close!,
      volume: q.volume ?? 0,
    }));

  return config.keepDays ? lastTradingDays(candles, config.keepDays) : candles;
}

/** Closing prices only, used for sparklines on overview cards. */
export async function getSparkline(symbol: string): Promise<number[]> {
  "use cache";
  cacheLife("hours");
  const candles = await getHistory(symbol, "1mo");
  // Hourly bars are too dense for a 120px sparkline; sample to ~40 points.
  const step = Math.max(1, Math.floor(candles.length / 40));
  return candles.filter((_, i) => i % step === 0 || i === candles.length - 1).map((c) => c.close);
}

/* ------------------------------------------------------------------ */
/* Profile & search                                                    */
/* ------------------------------------------------------------------ */

export async function getProfile(symbol: string): Promise<Profile | null> {
  "use cache";
  cacheLife("days");

  if (MOCK) return mockProfile(symbol);

  const summary = await yf.quoteSummary(symbol, { modules: ["assetProfile"] });
  const p = summary.assetProfile as Loose | undefined;
  if (!p) return null;
  return {
    sector: str(p.sector),
    industry: str(p.industry),
    summary: str(p.longBusinessSummary),
    website: str(p.website),
    employees: num(p.fullTimeEmployees),
    location: [str(p.city), str(p.country)].filter(Boolean).join(", ") || null,
  };
}

const SEARCHABLE_TYPES = new Set(["EQUITY", "ETF", "INDEX", "MUTUALFUND", "CRYPTOCURRENCY", "CURRENCY", "FUTURE"]);

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  "use cache";
  cacheLife("days");

  const q = query.trim();
  if (!q) return [];
  if (MOCK) return mockSearch(q);

  const result = await yf.search(q, { quotesCount: 10, newsCount: 0 });
  const rows = (result.quotes as Loose[])
    .filter((r) => r.isYahooFinance && SEARCHABLE_TYPES.has(String(r.quoteType)))
    .map((r) => ({
      symbol: String(r.symbol),
      name: str(r.longname) ?? str(r.shortname) ?? String(r.symbol),
      exchange: str(r.exchDisp) ?? str(r.exchange) ?? "",
      type: String(r.quoteType),
    }));

  // India-first: NSE/BSE listings float to the top.
  const rank = (s: string) => (s.endsWith(".NS") ? 0 : s.endsWith(".BO") ? 1 : 2);
  return rows.sort((a, b) => rank(a.symbol) - rank(b.symbol));
}

/* ------------------------------------------------------------------ */
/* Safe wrappers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Cached functions throw on failure so errors are never cached.
 * Pages use these wrappers to degrade gracefully instead of crashing.
 */
export async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error("[market-data]", error instanceof Error ? error.message : error);
    return fallback;
  }
}
