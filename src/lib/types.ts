export type Range = "1d" | "5d" | "1mo" | "6mo" | "1y" | "5y";

export const RANGES: { value: Range; label: string }[] = [
  { value: "1d", label: "1D" },
  { value: "5d", label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "5y", label: "5Y" },
];

export function isRange(value: unknown): value is Range {
  return RANGES.some((r) => r.value === value);
}

export type Quote = {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  quoteType: string;
  marketState: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  avgVolume: number | null;
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
};

/** `time` is a UNIX timestamp in seconds (lightweight-charts format). */
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Profile = {
  sector: string | null;
  industry: string | null;
  summary: string | null;
  website: string | null;
  employees: number | null;
  location: string | null;
};

export type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
};
