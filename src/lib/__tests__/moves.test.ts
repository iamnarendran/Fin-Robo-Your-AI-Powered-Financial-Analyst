import { describe, expect, it } from "vitest";
import { buildTimeline, detectMoves, headlineTone, titleKey, type Article } from "../moves";
import type { Candle } from "../types";

const DAY = 86_400;
const T0 = Date.UTC(2026, 0, 5, 4) / 1000; // a Monday, 04:00 UTC (~09:30 IST)

/** Gentle zig-zag of ±0.5%, with optional shocks on given session indexes. */
function series(n: number, shocks: Record<number, number> = {}, start = 100): Candle[] {
  const out: Candle[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    if (i > 0) price *= 1 + (shocks[i] ?? (i % 2 ? 0.005 : -0.005));
    out.push({ time: T0 + i * DAY, open: price, high: price, low: price, close: price, volume: 1 });
  }
  return out;
}

const article = (id: string, title: string, at: number): Article => ({
  id, title, publisher: "Test", url: "https://example.com", publishedAt: at * 1000, tone: headlineTone(title),
});

describe("headlineTone", () => {
  it("reads direction from common market verbs", () => {
    expect(headlineTone("Reliance shares surge after Q2 beat")).toBe("positive");
    expect(headlineTone("Infosys slides as brokerage downgrades stock")).toBe("negative");
    expect(headlineTone("TCS board to meet on Thursday")).toBe("neutral");
  });
  it("calls mixed headlines neutral", () => {
    expect(headlineTone("Profit rises but shares fall on weak guidance")).toBe("neutral");
  });
});

describe("detectMoves", () => {
  it("flags only statistically unusual sessions", () => {
    const moves = detectMoves(series(60, { 40: 0.06, 50: -0.05 }));
    expect(moves.map((m) => m.date)).toEqual(["2026-02-14", "2026-02-24"]);
    expect(moves[0].changePct).toBeCloseTo(6, 5);
    expect(moves[1].zScore).toBeLessThan(-2);
  });
  it("ignores quiet series and short histories", () => {
    expect(detectMoves(series(60))).toEqual([]);
    expect(detectMoves(series(10, { 5: 0.2 }))).toEqual([]);
  });
  it("respects the lookback window", () => {
    expect(detectMoves(series(60, { 10: 0.06, 55: 0.06 }), { lookbackSessions: 10 })).toHaveLength(1);
  });
});

describe("buildTimeline", () => {
  const candles = series(60, { 50: 0.06 });
  const moveTime = candles[50].time;

  it("links news published between the previous close and the move day", () => {
    const articles = [
      article("1", "Stock jumps on order win", moveTime + 3600),
      article("2", "Stock falls on probe", moveTime - 2 * DAY),
      article("3", "Old unrelated story", moveTime - 20 * DAY),
    ];
    const [latest, shock] = buildTimeline({ candles, articles });
    expect(latest.unusual).toBe(false); // latest session is always included
    expect(shock.date).toBe("2026-02-24");
    expect(shock.articleIds).toEqual(["1"]);
  });

  it("prefers headlines whose tone matches the move", () => {
    const articles = [
      article("1", "Company to hold analyst meet", moveTime + 7200),
      article("2", "Shares fall on weak demand", moveTime + 3600),
      article("3", "Shares surge after record order", moveTime + 1800),
    ];
    const shock = buildTimeline({ candles, articles }).find((m) => m.unusual)!;
    expect(shock.articleIds[0]).toBe("3");
  });

  it("separates stock-specific moves from market-wide ones", () => {
    const quietBench = series(60, {}, 25000);
    const loudBench = series(60, { 50: 0.05 }, 25000);
    const specific = buildTimeline({ candles, articles: [], benchmark: quietBench }).find((m) => m.unusual)!;
    const wide = buildTimeline({ candles, articles: [], benchmark: loudBench }).find((m) => m.unusual)!;
    expect(specific.kind).toBe("stock-specific");
    expect(specific.relativePct).toBeCloseTo(6 - -0.5, 1); // benchmark dipped 0.5% that day
    expect(wide.kind).toBe("market-wide");
  });
});

describe("buildTimeline noise filter", () => {
  it("does not classify a quiet latest session", () => {
    const quiet = series(60); // last session is a ±0.5% zig-zag
    const [latest] = buildTimeline({ candles: quiet, articles: [], benchmark: series(60, { 59: 0.004 }, 25000) });
    expect(latest.unusual).toBe(false);
    expect(latest.kind).toBe("unknown");
  });
});

describe("titleKey", () => {
  it("normalises the same story from different feeds", () => {
    expect(titleKey("Reliance Q2: Profit up 9%!")).toBe(titleKey("reliance q2 profit up 9"));
  });
});
