import "server-only";

import { z } from "zod";
import { getProfile, getQuotes } from "./market-data";
import { summarizePortfolio, type Holding, type PortfolioSummary, type PricedHolding } from "./portfolio";

export const MAX_HOLDINGS = 50;

export const holdingsSchema = z
  .array(
    z.object({
      symbol: z.string().regex(/^[\w.^=&-]{1,24}$/).transform((s) => s.toUpperCase()),
      quantity: z.number().positive().finite(),
      avgPrice: z.number().positive().finite(),
    }),
  )
  .max(MAX_HOLDINGS);

export type PortfolioAnalysis = PortfolioSummary & { missing: string[] };

/** Prices holdings with live quotes, sectors and the USD/INR rate, then summarises them. */
export async function analyzePortfolio(holdings: Holding[]): Promise<PortfolioAnalysis> {
  const symbols = [...new Set(holdings.map((h) => h.symbol))];
  const [quotes, fx] = await Promise.all([getQuotes(symbols), getQuotes(["INR=X"]).catch(() => [])]);
  const usdInr = fx[0]?.price ?? 88;
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  const sectors = await Promise.all(
    symbols.map((s) =>
      getProfile(s)
        .then((p) => p?.sector ?? null)
        .catch(() => null),
    ),
  );
  const sectorBySymbol = new Map(symbols.map((s, i) => [s, sectors[i]]));

  const priced: PricedHolding[] = [];
  const missing: string[] = [];
  for (const h of holdings) {
    const q = bySymbol.get(h.symbol);
    if (!q || q.price == null) {
      missing.push(h.symbol);
      continue;
    }
    priced.push({
      ...h,
      name: q.name,
      currency: q.currency,
      price: q.price,
      previousClose: q.previousClose,
      sector: sectorBySymbol.get(h.symbol) ?? (q.quoteType === "ETF" ? "ETF" : null),
    });
  }
  return { ...summarizePortfolio(priced, usdInr), missing };
}
