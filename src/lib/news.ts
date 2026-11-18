import "server-only";

import { cacheLife } from "next/cache";
import YahooFinance from "yahoo-finance2";
import { getHistory } from "./market-data";
import { isIndianSymbol } from "./markets";
import { mockNews } from "./mock-data";
import { buildTimeline, headlineTone, titleKey, type Article, type Move } from "./moves";
import type { Candle } from "./types";

/**
 * Headlines from two free sources, merged and de-duplicated:
 *  - Yahoo Finance search news (good for US and large Indian caps)
 *  - Google News RSS, India edition for NSE/BSE symbols (broad Indian coverage)
 */

const MOCK = process.env.FINROBO_MOCK === "1";
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1];

/** Strip legal suffixes so search queries match how the press names companies. */
export function searchableName(name: string) {
  return name.replace(/\b(limited|ltd\.?|inc\.?|corporation|corp\.?|plc|co\.?|company)\b/gi, "").replace(/[.,]+$/, "").replace(/\s+/g, " ").trim();
}

async function googleNews(symbol: string, name: string): Promise<Article[]> {
  const indian = isIndianSymbol(symbol);
  const isIndex = symbol.startsWith("^");
  const query = isIndex ? `${name} today` : `"${searchableName(name)}" ${indian ? "share price" : "stock"}`;
  const params = new URLSearchParams({ q: `${query} when:30d`, ...(indian ? { hl: "en-IN", gl: "IN", ceid: "IN:en" } : { hl: "en-US", gl: "US", ceid: "US:en" }) });

  const res = await fetch(`https://news.google.com/rss/search?${params}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FinRobo/2.0)" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Google News ${res.status}`);
  const xml = await res.text();

  return xml
    .split("<item>")
    .slice(1, 25)
    .map((item): Article | null => {
      const rawTitle = tag(item, "title");
      const link = tag(item, "link");
      const pubDate = tag(item, "pubDate");
      if (!rawTitle || !link || !pubDate) return null;
      const publisher = decode(tag(item, "source") ?? "Google News");
      const title = decode(rawTitle).replace(new RegExp(`\\s+-\\s+${publisher.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
      return { id: "", title, publisher, url: decode(link), publishedAt: new Date(pubDate).getTime(), tone: headlineTone(title) };
    })
    .filter((a): a is Article => a != null && Number.isFinite(a.publishedAt));
}

async function yahooNews(symbol: string): Promise<Article[]> {
  const result = await yf.search(symbol, { quotesCount: 0, newsCount: 12 });
  return result.news.map((n) => ({
    id: "",
    title: n.title,
    publisher: n.publisher,
    url: n.link,
    publishedAt: new Date(n.providerPublishTime).getTime(),
    tone: headlineTone(n.title),
  }));
}

export async function getNews(symbol: string, name: string): Promise<Article[]> {
  "use cache";
  cacheLife("minutes");

  if (MOCK) return mockNews(symbol, name);

  const settled = await Promise.allSettled([googleNews(symbol, name), yahooNews(symbol)]);
  const all = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (all.length === 0 && settled.every((r) => r.status === "rejected")) {
    throw new Error("News sources unavailable");
  }

  const seen = new Set<string>();
  const cutoff = Date.now() - 45 * 86_400_000;
  return all
    .filter((a) => a.publishedAt >= cutoff)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .filter((a) => {
      const key = titleKey(a.title);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20)
    .map((a, i) => ({ ...a, id: String(i + 1) }));
}

/* ------------------------------------------------------------------ */
/* Moves + news                                                        */
/* ------------------------------------------------------------------ */

export function benchmarkFor(symbol: string) {
  if (symbol.startsWith("^") || symbol.includes("=") || symbol.endsWith("-USD")) return null;
  return isIndianSymbol(symbol) ? { symbol: "^NSEI", name: "NIFTY 50" } : { symbol: "^GSPC", name: "S&P 500" };
}

export type MoveTimeline = {
  moves: Move[];
  articles: Article[];
  benchmark: { symbol: string; name: string } | null;
  /** Daily candles used for detection (1 year). */
  candles: Candle[];
};

/** Everything the "why did it move" UI and AI tool need, in one call. */
export async function getMoveTimeline(symbol: string, name: string): Promise<MoveTimeline> {
  const bench = benchmarkFor(symbol);
  const [candles, benchmarkCandles, articles] = await Promise.all([
    getHistory(symbol, "1y"),
    bench ? getHistory(bench.symbol, "1y").catch(() => [] as Candle[]) : Promise.resolve([] as Candle[]),
    getNews(symbol, name).catch(() => [] as Article[]),
  ]);
  const moves = buildTimeline({ candles, articles, benchmark: benchmarkCandles });
  return { moves, articles, benchmark: bench, candles };
}
