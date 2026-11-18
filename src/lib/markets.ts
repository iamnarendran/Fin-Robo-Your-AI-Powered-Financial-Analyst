/**
 * Static market catalogue. India first, global second.
 * Symbols follow Yahoo Finance conventions: `.NS` = NSE, `.BO` = BSE, `^` = index.
 */

export type Instrument = { symbol: string; name: string; short?: string };

export const INDIA_INDICES: Instrument[] = [
  { symbol: "^NSEI", name: "NIFTY 50" },
  { symbol: "^BSESN", name: "SENSEX" },
  { symbol: "^NSEBANK", name: "NIFTY Bank" },
  { symbol: "^CNXIT", name: "NIFTY IT" },
];

export const GLOBAL_MARKETS: Instrument[] = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq" },
  { symbol: "INR=X", name: "USD / INR" },
  { symbol: "GC=F", name: "Gold" },
  { symbol: "BZ=F", name: "Brent Crude" },
  { symbol: "BTC-USD", name: "Bitcoin" },
];

/** NIFTY 50 constituents, used for the top movers board. */
export const NIFTY_50: Instrument[] = [
  ["RELIANCE", "Reliance Industries"], ["HDFCBANK", "HDFC Bank"], ["ICICIBANK", "ICICI Bank"],
  ["BHARTIARTL", "Bharti Airtel"], ["TCS", "Tata Consultancy Services"], ["INFY", "Infosys"],
  ["SBIN", "State Bank of India"], ["ITC", "ITC"], ["LT", "Larsen & Toubro"],
  ["HINDUNILVR", "Hindustan Unilever"], ["BAJFINANCE", "Bajaj Finance"], ["KOTAKBANK", "Kotak Mahindra Bank"],
  ["AXISBANK", "Axis Bank"], ["MARUTI", "Maruti Suzuki"], ["SUNPHARMA", "Sun Pharma"],
  ["HCLTECH", "HCL Technologies"], ["M&M", "Mahindra & Mahindra"], ["NTPC", "NTPC"],
  ["ULTRACEMCO", "UltraTech Cement"], ["TITAN", "Titan Company"], ["ONGC", "ONGC"],
  ["POWERGRID", "Power Grid"], ["ADANIPORTS", "Adani Ports"], ["TATASTEEL", "Tata Steel"],
  ["ASIANPAINT", "Asian Paints"], ["BAJAJFINSV", "Bajaj Finserv"], ["NESTLEIND", "Nestlé India"],
  ["WIPRO", "Wipro"], ["JSWSTEEL", "JSW Steel"], ["COALINDIA", "Coal India"],
  ["TECHM", "Tech Mahindra"], ["GRASIM", "Grasim Industries"], ["HINDALCO", "Hindalco"],
  ["INDUSINDBK", "IndusInd Bank"], ["CIPLA", "Cipla"], ["DRREDDY", "Dr. Reddy's"],
  ["EICHERMOT", "Eicher Motors"], ["SBILIFE", "SBI Life"], ["HDFCLIFE", "HDFC Life"],
  ["BRITANNIA", "Britannia"], ["APOLLOHOSP", "Apollo Hospitals"], ["HEROMOTOCO", "Hero MotoCorp"],
  ["TATACONSUM", "Tata Consumer"], ["BAJAJ-AUTO", "Bajaj Auto"], ["SHRIRAMFIN", "Shriram Finance"],
  ["ADANIENT", "Adani Enterprises"], ["TRENT", "Trent"], ["BEL", "Bharat Electronics"],
  ["ETERNAL", "Eternal (Zomato)"], ["JIOFIN", "Jio Financial"],
].map(([s, name]) => ({ symbol: `${s}.NS`, name }));

export const POPULAR_US: Instrument[] = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NFLX", name: "Netflix" },
];

export const POPULAR_SEARCHES: Instrument[] = [
  ...NIFTY_50.slice(0, 6),
  ...POPULAR_US.slice(0, 4),
];

const KNOWN = new Map<string, string>(
  [...INDIA_INDICES, ...GLOBAL_MARKETS, ...NIFTY_50, ...POPULAR_US].map((i) => [i.symbol, i.name]),
);

export function knownName(symbol: string) {
  return KNOWN.get(symbol);
}

/** Display ticker without the exchange suffix: `RELIANCE.NS` → `RELIANCE`. */
export function displaySymbol(symbol: string) {
  return symbol.replace(/\.(NS|BO)$/, "");
}

export function isIndianSymbol(symbol: string) {
  return /\.(NS|BO)$/.test(symbol) || ["^NSEI", "^BSESN", "^NSEBANK", "^CNXIT"].includes(symbol);
}

/* ------------------------------------------------------------------ */
/* Market hours                                                        */
/* ------------------------------------------------------------------ */

type Session = { id: "NSE" | "NYSE"; label: string; tz: string; open: number; close: number };

const SESSIONS: Session[] = [
  { id: "NSE", label: "NSE", tz: "Asia/Kolkata", open: 9 * 60 + 15, close: 15 * 60 + 30 },
  { id: "NYSE", label: "NYSE", tz: "America/New_York", open: 9 * 60 + 30, close: 16 * 60 },
];

export type MarketSession = { id: string; label: string; isOpen: boolean; localTime: string };

/** Weekday + regular-hours check. Exchange holidays are not modelled. */
export function getMarketSessions(now = new Date()): MarketSession[] {
  return SESSIONS.map((s) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: s.tz,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const minutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
    const weekend = ["Sat", "Sun"].includes(get("weekday"));
    return {
      id: s.id,
      label: s.label,
      isOpen: !weekend && minutes >= s.open && minutes < s.close,
      localTime: new Intl.DateTimeFormat("en-IN", {
        timeZone: s.tz,
        hour: "numeric",
        minute: "2-digit",
      }).format(now),
    };
  });
}
