import { describe, expect, it } from "vitest";
import { templateBrief } from "../brief-template";
import type { CompactQuote, MarketSnapshot } from "../market-data";

const q = (symbol: string, name: string, changePercent: number, price = 100): CompactQuote => ({
  symbol, name, changePercent, price, change: 0, currency: "INR", marketState: "CLOSED",
});

const snapshot: MarketSnapshot = {
  indices: [q("^NSEI", "NIFTY 50", 0.82), q("^BSESN", "SENSEX", 0.75), q("^NSEBANK", "NIFTY Bank", 1.4), q("^CNXIT", "NIFTY IT", -0.6)],
  global: [q("^GSPC", "S&P 500", -0.3), q("INR=X", "USD / INR", 0.1, 88.62)],
  gainers: [q("TATASTEEL.NS", "Tata Steel", 3.1)],
  losers: [q("WIPRO.NS", "Wipro", -2.4)],
  breadth: { advancing: 34, declining: 16 },
};

describe("templateBrief", () => {
  it("summarises direction, breadth, sectors, movers and global cues from data alone", () => {
    const b = templateBrief(snapshot, [
      { id: "1", title: "RBI policy decision due Friday", publisher: "X", url: "#", publishedAt: 0, tone: "neutral" },
    ]);
    expect(b.headline).toBe("Gains for Indian stocks: NIFTY 50 +0.82%");
    expect(b.summary).toContain("The NIFTY 50 rose 0.82% and the SENSEX rose 0.75%.");
    expect(b.summary).toContain("34 NIFTY stocks advancing and 16 declining");
    expect(b.keyPoints.map((k) => k.title)).toEqual(["Sector split", "Biggest movers", "Global cues"]);
    expect(b.keyPoints[0].detail).toBe("NIFTY Bank +1.40% outpaced NIFTY IT -0.60%.");
    expect(b.keyPoints[2].detail).toContain("rupee at 88.62 per dollar");
    expect(b.watch).toEqual(["RBI policy decision due Friday"]);
  });

  it("handles a down day and missing data", () => {
    const b = templateBrief({ ...snapshot, indices: [q("^NSEI", "NIFTY 50", -1.1)], global: [], gainers: [], losers: [], breadth: { advancing: 5, declining: 45 } }, []);
    expect(b.headline).toMatch(/^Losses/);
    expect(b.summary).toContain("The NIFTY 50 fell 1.10%");
    expect(b.summary).toContain("Breadth was negative");
    expect(b.keyPoints).toEqual([]);
    expect(b.watch).toEqual([]);
  });
});
