import { INDIA_INDICES, GLOBAL_MARKETS, NIFTY_50, POPULAR_US, knownName } from "./markets";
import { detectMoves, headlineTone, type Article } from "./moves";
import type { Candle, Profile, Quote, Range, SearchResult } from "./types";

/**
 * Deterministic synthetic market data, enabled with FINROBO_MOCK=1.
 * The same symbol always produces the same series, so screenshots and tests are stable.
 */

const BASE_PRICES: Record<string, number> = {
  "^NSEI": 25800, "^BSESN": 84500, "^NSEBANK": 58200, "^CNXIT": 36400,
  "^GSPC": 6650, "^IXIC": 22400, "INR=X": 88.6, "GC=F": 4050, "BZ=F": 64.2, "BTC-USD": 92000,
};

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function basePrice(symbol: string) {
  return BASE_PRICES[symbol] ?? 80 + (hash(symbol) % 3500);
}

function currencyOf(symbol: string) {
  if (/\.(NS|BO)$/.test(symbol) || ["^NSEI", "^BSESN", "^NSEBANK", "^CNXIT", "INR=X"].includes(symbol)) return "INR";
  return "USD";
}

const MASTER_DAYS = 365 * 5 + 7;
const masterCache = new Map<string, Candle[]>();

/** Last `days` calendar days of one shared 5-year walk, so every range agrees. */
function dailySeries(symbol: string, days: number): Candle[] {
  let master = masterCache.get(symbol);
  if (!master) {
    master = generateWalk(symbol, MASTER_DAYS);
    masterCache.set(symbol, master);
  }
  const cutoff = master[master.length - 1].time - days * 86_400;
  return master.filter((c) => c.time > cutoff);
}

/** Daily random walk ending at today's (UTC) date. */
function generateWalk(symbol: string, days: number): Candle[] {
  const rand = rng(hash(symbol));
  const vol = symbol.startsWith("^") ? 0.009 : 0.017;
  const drift = (rand() - 0.42) * 0.0012;
  const today = new Date();
  today.setUTCHours(10, 0, 0, 0);

  const candles: Candle[] = [];
  let price = basePrice(symbol) * (0.55 + rand() * 0.3);
  for (let i = days; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 86_400_000);
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;
    const open = price;
    // Real returns have fat tails: roughly one session in 25 is a news-driven shock.
    const shock = rand() < 0.04 ? (rand() < 0.5 ? -1 : 1) * vol * (3 + rand() * 2) : 0;
    const close = Math.max(1, open * (1 + drift + shock + (rand() - 0.5) * 2 * vol));
    const high = Math.max(open, close) * (1 + rand() * vol * 0.6);
    const low = Math.min(open, close) * (1 - rand() * vol * 0.6);
    candles.push({
      time: Math.floor(date.getTime() / 1000),
      open, high, low, close,
      volume: Math.round((symbol.startsWith("^") ? 0 : 2e6) * (0.5 + rand())),
    });
    price = close;
  }
  // Rescale so the latest close lands on the base price.
  const factor = basePrice(symbol) / candles[candles.length - 1].close;
  return candles.map((c) => ({ ...c, open: c.open * factor, high: c.high * factor, low: c.low * factor, close: c.close * factor }));
}

function intraday(symbol: string, tradingDays: number, stepMinutes: number): Candle[] {
  const daily = dailySeries(symbol, 30).slice(-tradingDays);
  const rand = rng(hash(symbol + "intraday"));
  const out: Candle[] = [];
  for (const day of daily) {
    const start = day.time - 4.75 * 3600; // ~09:15 IST-ish session start
    const bars = Math.floor((6.25 * 60) / stepMinutes);
    let price = day.open;
    for (let b = 0; b < bars; b++) {
      const target = day.open + ((day.close - day.open) * (b + 1)) / bars;
      const next = target + (rand() - 0.5) * (day.high - day.low) * 0.25;
      out.push({
        time: start + b * stepMinutes * 60,
        open: price,
        high: Math.max(price, next) * 1.0005,
        low: Math.min(price, next) * 0.9995,
        close: next,
        volume: Math.round(day.volume / bars),
      });
      price = next;
    }
  }
  return out;
}

export function mockHistory(symbol: string, range: Range): Candle[] {
  switch (range) {
    case "1d": return intraday(symbol, 1, 5);
    case "5d": return intraday(symbol, 5, 15);
    case "1mo": return dailySeries(symbol, 31);
    case "6mo": return dailySeries(symbol, 183);
    case "1y": return dailySeries(symbol, 366);
    case "5y": return dailySeries(symbol, 365 * 5).filter((_, i, all) => (all.length - 1 - i) % 5 === 0);
  }
}

export function mockQuote(symbol: string): Quote {
  const year = dailySeries(symbol, 366);
  const last = year[year.length - 1];
  const prev = year[year.length - 2];
  const closes = year.map((c) => c.close);
  const rand = rng(hash(symbol + "quote"));
  const isIndex = symbol.startsWith("^") || symbol.includes("=") || symbol.includes("-");
  const change = last.close - prev.close;
  return {
    symbol,
    name: knownName(symbol) ?? symbol,
    currency: currencyOf(symbol),
    exchange: symbol.endsWith(".NS") ? "NSE" : symbol.endsWith(".BO") ? "BSE" : isIndex ? "Index" : "NasdaqGS",
    quoteType: isIndex ? "INDEX" : "EQUITY",
    marketState: "CLOSED",
    price: last.close,
    change,
    changePercent: (change / prev.close) * 100,
    previousClose: prev.close,
    open: last.open,
    dayHigh: last.high,
    dayLow: last.low,
    volume: last.volume,
    avgVolume: year.slice(-60).reduce((a, c) => a + c.volume, 0) / 60,
    marketCap: isIndex ? null : last.close * (2e8 + rand() * 6e9),
    pe: isIndex ? null : 12 + rand() * 50,
    eps: isIndex ? null : last.close / (12 + rand() * 50),
    dividendYield: isIndex ? null : rand() * 2.5,
    fiftyTwoWeekHigh: Math.max(...closes),
    fiftyTwoWeekLow: Math.min(...closes),
  };
}

const SECTOR_RULES: [RegExp, string, string][] = [
  [/bank|financ|life|jio fin|bajaj finserv|shriram/i, "Financial Services", "Banks & Insurance"],
  [/pharma|cipla|reddy|hospital/i, "Healthcare", "Pharmaceuticals"],
  [/steel|hindalco|coal|ongc|ntpc|power|reliance|adani/i, "Energy & Materials", "Energy, Metals & Utilities"],
  [/motor|auto|maruti|mahindra|eicher|hero/i, "Consumer Cyclical", "Automobiles"],
  [/unilever|itc|nestl|britannia|tata consumer|titan|trent|asian paints|eternal/i, "Consumer Defensive", "Consumer Goods"],
  [/airtel|meta|alphabet|netflix/i, "Communication Services", "Telecom & Media"],
  [/larsen|ultratech|grasim|ports|electronics/i, "Industrials", "Engineering & Infrastructure"],
];

function mockSector(name: string) {
  const rule = SECTOR_RULES.find(([re]) => re.test(name));
  return rule ? { sector: rule[1], industry: rule[2] } : { sector: "Technology", industry: "Information Technology Services" };
}

export function mockProfile(symbol: string): Profile | null {
  if (symbol.startsWith("^") || symbol.includes("=")) return null;
  const name = knownName(symbol) ?? symbol;
  return {
    ...mockSector(name),
    summary: `${name} is shown here with synthetic demo data because Fin-Robo is running in mock mode (FINROBO_MOCK=1). Deploy without this flag to see the real company profile from Yahoo Finance.`,
    website: null,
    employees: 100000 + (hash(symbol) % 500000),
    location: symbol.endsWith(".NS") ? "Mumbai, India" : "California, United States",
  };
}

export function mockSearch(query: string): SearchResult[] {
  const q = query.toLowerCase();
  return [...NIFTY_50, ...POPULAR_US, ...INDIA_INDICES, ...GLOBAL_MARKETS]
    .filter((i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
    .slice(0, 10)
    .map((i) => ({
      symbol: i.symbol,
      name: i.name,
      exchange: i.symbol.endsWith(".NS") ? "NSE" : i.symbol.startsWith("^") ? "Index" : "NASDAQ",
      type: i.symbol.startsWith("^") ? "INDEX" : "EQUITY",
    }));
}

const UP_HEADLINES = [
  "{name} shares jump after strong quarterly results beat estimates",
  "{name} rallies as brokerages upgrade the stock on margin outlook",
  "{name} wins large order, stock climbs to multi-week high",
];
const DOWN_HEADLINES = [
  "{name} shares fall after quarterly profit misses estimates",
  "{name} slides as brokerage downgrades stock, cuts target",
  "{name} drops amid sector-wide sell-off in heavyweights",
];
const BACKGROUND_HEADLINES = [
  "What analysts expect from {name} ahead of next quarter",
  "{name} board to consider fundraise proposal next week",
  "FII holding in {name} changes marginally in latest filing",
  "{name} management outlines growth plans at investor meet",
];

/** Demo headlines placed on the same days as the mock series' unusual moves. */
export function mockNews(symbol: string, name: string): Article[] {
  const candles = mockHistory(symbol, "1y");
  const rand = rng(hash(symbol + "news"));
  const pick = (list: string[]) => list[Math.floor(rand() * list.length)].replace("{name}", name);
  const articles: Omit<Article, "id">[] = [];

  for (const move of detectMoves(candles, { lookbackSessions: 22 })) {
    const title = pick(move.changePct > 0 ? UP_HEADLINES : DOWN_HEADLINES);
    articles.push({ title, publisher: "Demo Wire", url: "https://example.com/demo-news", publishedAt: (move.time + 2 * 3600) * 1000, tone: headlineTone(title) });
  }
  const latest = candles[candles.length - 1].time;
  for (let i = 0; i < 4; i++) {
    const title = BACKGROUND_HEADLINES[i].replace("{name}", name);
    articles.push({ title, publisher: "Demo Wire", url: "https://example.com/demo-news", publishedAt: (latest - i * 3 * 86_400 + 3600) * 1000, tone: headlineTone(title) });
  }
  return articles.sort((a, b) => b.publishedAt - a.publishedAt).map((a, i) => ({ ...a, id: String(i + 1) }));
}
