import type { Candle } from "./types";

/**
 * Pure analytics on daily candles. Shared by the stock page today and by the
 * AI analyst's tools in phase 2, so every number the AI quotes is computed here
 * rather than guessed by the model.
 */

const TRADING_DAYS = 252;

export function pctChange(from: number, to: number) {
  return from === 0 ? null : ((to - from) / from) * 100;
}

/** Return over the last `days` trading sessions (null if not enough history). */
export function trailingReturn(candles: Candle[], days: number) {
  if (candles.length <= days) return null;
  const last = candles[candles.length - 1].close;
  const past = candles[candles.length - 1 - days].close;
  return pctChange(past, last);
}

export function dailyReturns(candles: Candle[]) {
  const out: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    out.push(candles[i].close / candles[i - 1].close - 1);
  }
  return out;
}

/** Annualised volatility of daily returns, in percent. */
export function volatility(candles: Candle[]) {
  const r = dailyReturns(candles);
  if (r.length < 2) return null;
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const variance = r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1);
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS) * 100;
}

/** Largest peak-to-trough fall, in percent (negative number). */
export function maxDrawdown(candles: Candle[]) {
  if (candles.length < 2) return null;
  let peak = candles[0].close;
  let worst = 0;
  for (const c of candles) {
    peak = Math.max(peak, c.close);
    worst = Math.min(worst, c.close / peak - 1);
  }
  return worst * 100;
}

export function sma(candles: Candle[], period: number) {
  if (candles.length < period) return null;
  const slice = candles.slice(-period);
  return slice.reduce((a, c) => a + c.close, 0) / period;
}

/** Wilder's RSI over `period` sessions. */
export function rsi(candles: Candle[], period = 14) {
  if (candles.length <= period) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].close - candles[i - 1].close;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].close - candles[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export type PerformanceSummary = {
  returns: { label: string; value: number | null }[];
  volatility: number | null;
  maxDrawdown: number | null;
  rsi14: number | null;
  sma50: number | null;
  sma200: number | null;
  trend: "above-both" | "below-both" | "mixed" | null;
};

/** Expects ~1 year of daily candles. */
export function summarize(candles: Candle[]): PerformanceSummary {
  const last = candles[candles.length - 1]?.close;
  const sma50 = sma(candles, 50);
  const sma200 = sma(candles, 200);
  let trend: PerformanceSummary["trend"] = null;
  if (last != null && sma50 != null && sma200 != null) {
    if (last > sma50 && last > sma200) trend = "above-both";
    else if (last < sma50 && last < sma200) trend = "below-both";
    else trend = "mixed";
  }
  return {
    returns: [
      { label: "1W", value: trailingReturn(candles, 5) },
      { label: "1M", value: trailingReturn(candles, 21) },
      { label: "3M", value: trailingReturn(candles, 63) },
      { label: "6M", value: trailingReturn(candles, 126) },
      { label: "1Y", value: candles.length > 1 ? pctChange(candles[0].close, last) : null },
    ],
    volatility: volatility(candles),
    maxDrawdown: maxDrawdown(candles),
    rsi14: rsi(candles),
    sma50,
    sma200,
    trend,
  };
}
