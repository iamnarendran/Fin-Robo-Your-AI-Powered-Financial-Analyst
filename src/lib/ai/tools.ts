import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { pctChange, summarize, maxDrawdown, rsi, volatility } from "@/lib/indicators";
import { getHistory, getProfile, getQuote, getQuotes, searchSymbols } from "@/lib/market-data";
import { GLOBAL_MARKETS, INDIA_INDICES, NIFTY_50 } from "@/lib/markets";
import type { Candle, Quote } from "@/lib/types";

/**
 * Tools the analyst can call. Each one returns data shaped for a specific UI
 * card (see components/chat/cards). Numbers come from market-data + indicators,
 * never from the model, so the AI can only narrate what was actually computed.
 *
 * `toModelOutput` keeps price series out of the model's context: the UI gets
 * the full payload, the model gets the compact facts it needs to write prose.
 */

const symbolSchema = z
  .string()
  .min(1)
  .max(24)
  .regex(/^[\w.^=&-]+$/, "Use a Yahoo Finance symbol, e.g. RELIANCE.NS, AAPL, ^NSEI")
  .transform((s) => s.toUpperCase());

type Point = { time: number; value: number };

/** Downsample to at most ~`max` points, always keeping the first and last. */
function sample(candles: Candle[], max: number): Point[] {
  const step = Math.max(1, Math.ceil(candles.length / max));
  return candles
    .filter((_, i) => i === 0 || (candles.length - 1 - i) % step === 0)
    .map((c) => ({ time: c.time, value: c.close }));
}

function compactQuote(q: Quote) {
  return {
    symbol: q.symbol,
    name: q.name,
    currency: q.currency,
    price: q.price,
    change: q.change,
    changePercent: q.changePercent,
    marketState: q.marketState,
  };
}

const round = (v: number | null, d = 2) => (v == null ? null : Number(v.toFixed(d)));

/** Plain-English observations derived from the numbers (no opinions). */
function signalsFor(q: Quote, perf: ReturnType<typeof summarize>) {
  const signals: string[] = [];
  if (q.price != null && q.fiftyTwoWeekHigh != null && q.price >= q.fiftyTwoWeekHigh * 0.97) signals.push("Trading within 3% of its 52-week high");
  if (q.price != null && q.fiftyTwoWeekLow != null && q.price <= q.fiftyTwoWeekLow * 1.05) signals.push("Trading within 5% of its 52-week low");
  if (perf.rsi14 != null && perf.rsi14 >= 70) signals.push(`RSI ${perf.rsi14.toFixed(0)} suggests overbought momentum`);
  if (perf.rsi14 != null && perf.rsi14 <= 30) signals.push(`RSI ${perf.rsi14.toFixed(0)} suggests oversold momentum`);
  if (perf.trend === "above-both") signals.push("Above both its 50-day and 200-day moving averages (uptrend)");
  if (perf.trend === "below-both") signals.push("Below both its 50-day and 200-day moving averages (downtrend)");
  if (perf.volatility != null && perf.volatility > 40) signals.push(`High volatility: ${perf.volatility.toFixed(0)}% annualised`);
  if (q.volume && q.avgVolume && q.volume > q.avgVolume * 1.8) signals.push("Volume today is well above its 3-month average");
  return signals;
}

async function requireQuote(symbol: string) {
  const quote = await getQuote(symbol);
  if (!quote || quote.price == null) {
    throw new Error(`No market data for "${symbol}". Use searchSymbol to find the right ticker (Indian stocks need .NS).`);
  }
  return quote;
}

export const tools = {
  searchSymbol: tool({
    description:
      "Find the Yahoo Finance ticker for a company or index name. Call this whenever you are not certain of the exact symbol. Indian NSE stocks end in .NS (RELIANCE.NS), BSE in .BO.",
    inputSchema: z.object({ query: z.string().min(1).max(64).describe("Company name or partial ticker") }),
    execute: async ({ query }) => ({ query, results: (await searchSymbols(query)).slice(0, 5) }),
  }),

  analyzeStock: tool({
    description:
      "Full snapshot of ONE stock or index: price, valuation, 1-year performance, volatility, drawdown, RSI, moving-average trend and notable signals. Renders an analysis card with a chart. Use for 'analyse X', 'how is X doing', 'is X expensive', etc.",
    inputSchema: z.object({ symbol: symbolSchema }),
    execute: async ({ symbol }) => {
      const [quote, year, profile] = await Promise.all([
        requireQuote(symbol),
        getHistory(symbol, "1y"),
        getProfile(symbol).catch(() => null),
      ]);
      const performance = summarize(year);
      return {
        quote,
        sector: profile?.sector ?? null,
        industry: profile?.industry ?? null,
        performance,
        signals: signalsFor(quote, performance),
        series: sample(year, 120),
      };
    },
    toModelOutput: ({ output }) => ({
      type: "json",
      value: {
        ...compactQuote(output.quote),
        marketCap: output.quote.marketCap,
        pe: round(output.quote.pe),
        eps: round(output.quote.eps),
        dividendYieldPct: round(output.quote.dividendYield),
        fiftyTwoWeekHigh: output.quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: output.quote.fiftyTwoWeekLow,
        sector: output.sector,
        industry: output.industry,
        returnsPct: Object.fromEntries(output.performance.returns.map((r) => [r.label, round(r.value, 1)])),
        volatilityPct: round(output.performance.volatility, 1),
        maxDrawdownPct: round(output.performance.maxDrawdown, 1),
        rsi14: round(output.performance.rsi14, 0),
        sma50: round(output.performance.sma50),
        sma200: round(output.performance.sma200),
        signals: output.signals,
      },
    }),
  }),

  compareStocks: tool({
    description:
      "Compare 2-5 stocks or indices over a period. Renders a performance chart (all rebased to 100) and a metrics table. Use for 'compare A and B', 'A vs B', 'which performed better'.",
    inputSchema: z.object({
      symbols: z.array(symbolSchema).min(2).max(5),
      range: z.enum(["1mo", "6mo", "1y", "5y"]).default("1y").describe("Comparison window"),
    }),
    execute: async ({ symbols, range }) => {
      const unique = [...new Set(symbols)];
      const [quotes, histories] = await Promise.all([
        getQuotes(unique),
        Promise.all(unique.map((s) => getHistory(s, range).catch(() => [] as Candle[]))),
      ]);
      const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));
      const rows = unique
        .map((symbol, i) => ({ symbol, quote: quoteBySymbol.get(symbol), candles: histories[i] }))
        .filter((r) => r.quote && r.candles.length > 1);
      if (rows.length < 2) throw new Error("Need market data for at least two of the symbols. Check the tickers with searchSymbol.");

      return {
        range,
        series: rows.map(({ symbol, quote, candles }) => {
          const base = candles[0].close;
          return {
            symbol,
            name: quote!.name,
            points: sample(candles, 150).map((p) => ({ time: p.time, value: (p.value / base) * 100 })),
          };
        }),
        metrics: rows.map(({ symbol, quote, candles }) => ({
          symbol,
          name: quote!.name,
          currency: quote!.currency,
          price: quote!.price,
          returnPct: pctChange(candles[0].close, candles[candles.length - 1].close),
          volatilityPct: volatility(candles),
          maxDrawdownPct: maxDrawdown(candles),
          rsi14: rsi(candles),
          pe: quote!.pe,
          marketCap: quote!.marketCap,
        })),
      };
    },
    toModelOutput: ({ output }) => ({
      type: "json",
      value: {
        range: output.range,
        metrics: output.metrics.map((m) => ({
          ...m,
          returnPct: round(m.returnPct, 1),
          volatilityPct: round(m.volatilityPct, 1),
          maxDrawdownPct: round(m.maxDrawdownPct, 1),
          rsi14: round(m.rsi14, 0),
          pe: round(m.pe),
        })),
      },
    }),
  }),

  getQuotes: tool({
    description: "Latest price and day change for 1-8 symbols. Renders compact quote tiles. Use for quick 'what's the price of' questions.",
    inputSchema: z.object({ symbols: z.array(symbolSchema).min(1).max(8) }),
    execute: async ({ symbols }) => {
      const quotes = await getQuotes([...new Set(symbols)]);
      if (quotes.length === 0) throw new Error("No quotes found. Check the tickers with searchSymbol.");
      return { quotes: quotes.map(compactQuote) };
    },
  }),

  getMarketOverview: tool({
    description:
      "Today's market snapshot: Indian indices (NIFTY 50, SENSEX, Bank, IT), global cues (S&P 500, Nasdaq, USD/INR, gold, crude, Bitcoin) and NIFTY 50 top gainers/losers. Use for 'how is the market today', 'what moved', 'NIFTY today'.",
    inputSchema: z.object({}),
    execute: async () => {
      const [indices, global, nifty] = await Promise.all([
        getQuotes(INDIA_INDICES.map((i) => i.symbol)),
        getQuotes(GLOBAL_MARKETS.map((i) => i.symbol)),
        getQuotes(NIFTY_50.map((i) => i.symbol)),
      ]);
      const ranked = nifty.filter((q) => q.changePercent != null).sort((a, b) => b.changePercent! - a.changePercent!);
      const breadth = { advancing: ranked.filter((q) => q.changePercent! > 0).length, declining: ranked.filter((q) => q.changePercent! < 0).length };
      return {
        indices: indices.map(compactQuote),
        global: global.map(compactQuote),
        gainers: ranked.slice(0, 4).map(compactQuote),
        losers: ranked.slice(-4).reverse().map(compactQuote),
        breadth,
      };
    },
  }),

  explainConcept: tool({
    description:
      "Teach a finance concept (P/E ratio, RSI, SIP, market cap, drawdown, etc.) as an explainer card. YOU write the content in the input. Optionally pass exampleSymbol to illustrate it with that stock's live numbers.",
    inputSchema: z.object({
      concept: z.string().max(60).describe("Short name of the concept, e.g. 'P/E ratio'"),
      summary: z.string().max(400).describe("One or two plain-English sentences a beginner understands"),
      keyPoints: z.array(z.string().max(200)).min(2).max(4).describe("How to read or use it, including a caveat"),
      exampleSymbol: symbolSchema.optional().describe("A stock to illustrate the concept with live data"),
    }),
    execute: async ({ concept, summary, keyPoints, exampleSymbol }) => {
      let example: Quote | null = null;
      if (exampleSymbol) example = await getQuote(exampleSymbol).catch(() => null);
      return { concept, summary, keyPoints, example };
    },
    toModelOutput: ({ output }) => ({
      type: "json",
      value: {
        shown: true,
        example: output.example && {
          ...compactQuote(output.example),
          pe: round(output.example.pe),
          eps: round(output.example.eps),
          marketCap: output.example.marketCap,
          dividendYieldPct: round(output.example.dividendYield),
        },
      },
    }),
  }),

  suggestFollowUps: tool({
    description: "ALWAYS call this last: offer 2-3 short, specific follow-up questions the user is likely to ask next. Rendered as clickable chips.",
    inputSchema: z.object({ suggestions: z.array(z.string().max(80)).min(2).max(3) }),
    execute: async ({ suggestions }) => ({ suggestions }),
  }),
};

export type FinRoboTools = typeof tools;
