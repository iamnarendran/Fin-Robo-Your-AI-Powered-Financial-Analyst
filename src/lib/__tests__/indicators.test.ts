import { describe, expect, it } from "vitest";
import { maxDrawdown, rsi, sma, summarize, trailingReturn, volatility } from "../indicators";
import type { Candle } from "../types";

const candles = (closes: number[]): Candle[] =>
  closes.map((close, i) => ({ time: i * 86_400, open: close, high: close, low: close, close, volume: 0 }));

describe("indicators", () => {
  it("computes trailing returns", () => {
    expect(trailingReturn(candles([100, 110, 121]), 2)).toBeCloseTo(21);
    expect(trailingReturn(candles([100, 110]), 5)).toBeNull();
  });

  it("finds the worst peak-to-trough fall", () => {
    expect(maxDrawdown(candles([100, 120, 90, 130, 117]))).toBeCloseTo(-25);
  });

  it("averages the last N closes", () => {
    expect(sma(candles([1, 2, 3, 4, 5]), 3)).toBe(4);
  });

  it("gives zero volatility for a constant series", () => {
    expect(volatility(candles([50, 50, 50, 50]))).toBe(0);
  });

  it("pins RSI at 100 when a series only rises", () => {
    expect(rsi(candles(Array.from({ length: 20 }, (_, i) => 100 + i)))).toBe(100);
  });

  it("classifies trend against the 50 and 200-day averages", () => {
    const rising = candles(Array.from({ length: 250 }, (_, i) => 100 + i));
    expect(summarize(rising).trend).toBe("above-both");
  });
});
