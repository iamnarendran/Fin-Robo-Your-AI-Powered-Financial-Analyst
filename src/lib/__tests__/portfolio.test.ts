import { describe, expect, it } from "vitest";
import { parseHoldingsCsv, summarizePortfolio, type PricedHolding } from "../portfolio";

const h = (o: Partial<PricedHolding> & Pick<PricedHolding, "symbol">): PricedHolding => ({
  name: o.symbol, quantity: 10, avgPrice: 100, currency: "INR", price: 100, previousClose: 100, sector: "Technology", ...o,
});

describe("summarizePortfolio", () => {
  it("computes P&L, day change and weights in INR", () => {
    const s = summarizePortfolio(
      [
        h({ symbol: "A.NS", quantity: 10, avgPrice: 100, price: 120, previousClose: 110 }),
        h({ symbol: "AAPL", quantity: 1, avgPrice: 10, price: 10, previousClose: 10, currency: "USD" }),
      ],
      80,
    );
    expect(s.investedInr).toBe(1000 + 800);
    expect(s.valueInr).toBe(1200 + 800);
    expect(s.pnlInr).toBe(200);
    expect(s.dayChangeInr).toBe(100);
    expect(s.positions[0].symbol).toBe("A.NS");
    expect(s.positions[0].weight).toBeCloseTo(0.6);
  });

  it("groups by sector and flags concentration, few holdings and FX exposure", () => {
    const s = summarizePortfolio(
      [
        h({ symbol: "A.NS", quantity: 70 }),
        h({ symbol: "B.NS", quantity: 20, sector: "Financial Services" }),
        h({ symbol: "MSFT", quantity: 1, currency: "USD", price: 1, avgPrice: 1 }),
      ],
      100,
    );
    expect(s.sectors[0]).toMatchObject({ sector: "Technology" });
    const titles = s.flags.map((f) => f.title);
    expect(titles).toContain("Concentrated in one stock");
    expect(titles).toContain("Sector-heavy");
    expect(titles).toContain("Few holdings");
    expect(titles).toContain("Currency exposure");
  });

  it("flags positions far below cost", () => {
    const s = summarizePortfolio([h({ symbol: "X.NS", avgPrice: 100, price: 70 })], 85);
    expect(s.flags.some((f) => f.title === "Positions well below cost")).toBe(true);
  });

  it("handles an empty portfolio", () => {
    const s = summarizePortfolio([], 85);
    expect(s.valueInr).toBe(0);
    expect(s.flags).toEqual([]);
  });
});

describe("parseHoldingsCsv", () => {
  it("reads a Zerodha Kite holdings export and adds the NSE suffix", () => {
    const csv = [
      '"Instrument","Qty.","Avg. cost","LTP","Cur. val","P&L","Net chg.","Day chg."',
      '"RELIANCE","10","2,450.50","2500","25000","495","2.0","0.5"',
      '"BAJAJ-AUTO","2","8000","8100","16200","200","1.2","0.1"',
      '"IDEA-BE","100","12","10","1000","-200","-16","1"',
    ].join("\n");
    const r = parseHoldingsCsv(csv);
    expect(r.format).toBe("zerodha");
    expect(r.errors).toEqual([]);
    expect(r.holdings).toEqual([
      { symbol: "RELIANCE.NS", quantity: 10, avgPrice: 2450.5 },
      { symbol: "BAJAJ-AUTO.NS", quantity: 2, avgPrice: 8000 },
      { symbol: "IDEA.NS", quantity: 100, avgPrice: 12 },
    ]);
  });

  it("reads the generic template, keeps explicit suffixes and merges duplicates", () => {
    const r = parseHoldingsCsv("symbol,quantity,avg_price\nINFY.NS,10,1500\nAAPL,5,180\ninfy.ns,10,1700\n");
    expect(r.format).toBe("generic");
    expect(r.holdings).toEqual([
      { symbol: "INFY.NS", quantity: 20, avgPrice: 1600 },
      { symbol: "AAPL", quantity: 5, avgPrice: 180 },
    ]);
  });

  it("uses an exchange column when present", () => {
    const r = parseHoldingsCsv("Symbol,Exchange,Quantity,Average Price\nTCS,BSE,3,3500\nHDFCBANK,NSE,4,1600");
    expect(r.holdings.map((x) => x.symbol)).toEqual(["TCS.BO", "HDFCBANK.NS"]);
  });

  it("reports bad rows and missing columns", () => {
    expect(parseHoldingsCsv("symbol,quantity,avg_price\nTCS.NS,abc,100").errors[0]).toMatch(/Row 2/);
    expect(parseHoldingsCsv("name,amount\nfoo,1").errors[0]).toMatch(/Couldn't find/);
  });
});
