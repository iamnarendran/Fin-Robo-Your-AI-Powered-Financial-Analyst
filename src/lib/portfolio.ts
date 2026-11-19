/**
 * Portfolio maths and CSV import. Pure functions, safe on client and server.
 *
 * Totals are reported in INR: Fin-Robo is India-first, so US holdings are
 * converted at the live USD/INR rate and the currency exposure is flagged.
 */

export type Holding = { symbol: string; quantity: number; avgPrice: number };

export type PricedHolding = Holding & {
  name: string;
  currency: string;
  price: number;
  previousClose: number | null;
  sector: string | null;
};

export type Position = PricedHolding & {
  /** Values below are in INR. */
  investedInr: number;
  valueInr: number;
  pnlInr: number;
  pnlPct: number;
  dayChangeInr: number | null;
  dayChangePct: number | null;
  weight: number;
};

export type Flag = { level: "warning" | "info"; title: string; detail: string };

export type PortfolioSummary = {
  positions: Position[];
  investedInr: number;
  valueInr: number;
  pnlInr: number;
  pnlPct: number;
  dayChangeInr: number;
  dayChangePct: number;
  usdInr: number;
  sectors: { sector: string; weight: number; valueInr: number }[];
  flags: Flag[];
};

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

const fxFor = (currency: string, usdInr: number) => (currency === "USD" ? usdInr : 1);
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function summarizePortfolio(priced: PricedHolding[], usdInr: number): PortfolioSummary {
  const rows = priced.map((h) => {
    const fx = fxFor(h.currency, usdInr);
    const investedInr = h.quantity * h.avgPrice * fx;
    const valueInr = h.quantity * h.price * fx;
    const dayChangeInr = h.previousClose == null ? null : h.quantity * (h.price - h.previousClose) * fx;
    return {
      ...h,
      investedInr,
      valueInr,
      pnlInr: valueInr - investedInr,
      pnlPct: investedInr ? (valueInr / investedInr - 1) * 100 : 0,
      dayChangeInr,
      dayChangePct: h.previousClose ? (h.price / h.previousClose - 1) * 100 : null,
    };
  });

  const valueInr = rows.reduce((a, r) => a + r.valueInr, 0);
  const investedInr = rows.reduce((a, r) => a + r.investedInr, 0);
  const dayChangeInr = rows.reduce((a, r) => a + (r.dayChangeInr ?? 0), 0);
  const positions: Position[] = rows
    .map((r) => ({ ...r, weight: valueInr ? r.valueInr / valueInr : 0 }))
    .sort((a, b) => b.valueInr - a.valueInr);

  const bySector = new Map<string, number>();
  for (const p of positions) bySector.set(p.sector ?? "Other", (bySector.get(p.sector ?? "Other") ?? 0) + p.valueInr);
  const sectors = [...bySector]
    .map(([sector, v]) => ({ sector, valueInr: v, weight: valueInr ? v / valueInr : 0 }))
    .sort((a, b) => b.valueInr - a.valueInr);

  return {
    positions,
    investedInr,
    valueInr,
    pnlInr: valueInr - investedInr,
    pnlPct: investedInr ? (valueInr / investedInr - 1) * 100 : 0,
    dayChangeInr,
    dayChangePct: valueInr - dayChangeInr ? (dayChangeInr / (valueInr - dayChangeInr)) * 100 : 0,
    usdInr,
    sectors,
    flags: riskFlags(positions, sectors),
  };
}

/** Descriptive checks only: they point out exposure, they don't recommend trades. */
export function riskFlags(positions: Position[], sectors: PortfolioSummary["sectors"]): Flag[] {
  const flags: Flag[] = [];
  if (positions.length === 0) return flags;

  const top = positions[0];
  if (top.weight > 0.25 && positions.length > 1) {
    flags.push({ level: "warning", title: "Concentrated in one stock", detail: `${top.name} is ${pct(top.weight)} of your portfolio. A bad quarter there moves everything.` });
  }
  const topSector = sectors[0];
  if (topSector && topSector.weight > 0.4 && topSector.sector !== "Other" && sectors.length > 1) {
    flags.push({ level: "warning", title: "Sector-heavy", detail: `${pct(topSector.weight)} sits in ${topSector.sector}. Sector-wide news will hit most of your holdings together.` });
  }
  if (positions.length < 5) {
    flags.push({ level: "warning", title: "Few holdings", detail: `Only ${positions.length} holding${positions.length === 1 ? "" : "s"}. Diversification usually needs more independent positions.` });
  }
  const deepLosers = positions.filter((p) => p.pnlPct <= -20);
  if (deepLosers.length) {
    flags.push({ level: "info", title: "Positions well below cost", detail: `${deepLosers.map((p) => p.name).join(", ")} ${deepLosers.length === 1 ? "is" : "are"} down 20% or more from your buy price.` });
  }
  const foreign = positions.filter((p) => p.currency !== "INR").reduce((a, p) => a + p.weight, 0);
  if (foreign > 0) {
    flags.push({ level: "info", title: "Currency exposure", detail: `${pct(foreign)} is in foreign stocks, so returns in ₹ also depend on the exchange rate.` });
  }
  return flags;
}

/* ------------------------------------------------------------------ */
/* CSV import                                                          */
/* ------------------------------------------------------------------ */

export type CsvImport = { holdings: Holding[]; errors: string[]; format: "zerodha" | "generic" };

const SYMBOL_COLS = ["symbol", "instrument", "ticker", "trading symbol", "tradingsymbol", "stock symbol"];
const QTY_COLS = ["quantity", "qty", "qty.", "quantity available", "shares", "units"];
const PRICE_COLS = ["avg. cost", "average price", "avg price", "avg_price", "average buy price", "avg cost", "buy price", "average cost", "avgprice", "avg. price"];
const EXCHANGE_COLS = ["exchange", "exch"];

/** Minimal RFC 4180 line splitter: handles quoted fields and escaped quotes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(field);
      field = "";
    } else field += ch;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

const toNumber = (s: string | undefined) => {
  if (s == null) return NaN;
  const n = Number(s.replace(/[₹$,\s]/g, ""));
  return n;
};

/**
 * Accepts Zerodha Kite/Console holdings exports and a generic
 * `symbol,quantity,avg_price` template. Duplicate symbols are merged at a
 * weighted average price.
 */
export function parseHoldingsCsv(text: string): CsvImport {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  if (lines.length < 2) return { holdings: [], errors: ["The file needs a header row and at least one holding."], format: "generic" };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const find = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iSymbol = find(SYMBOL_COLS);
  const iQty = find(QTY_COLS);
  const iPrice = find(PRICE_COLS);
  const iExchange = find(EXCHANGE_COLS);

  if (iSymbol < 0 || iQty < 0 || iPrice < 0) {
    return {
      holdings: [],
      errors: ["Couldn't find symbol, quantity and average price columns. Use a Zerodha holdings export or the template: symbol,quantity,avg_price"],
      format: "generic",
    };
  }

  const format: CsvImport["format"] = header.includes("instrument") || header.includes("isin") ? "zerodha" : "generic";
  const merged = new Map<string, Holding>();

  lines.slice(1).forEach((line, idx) => {
    const cells = splitCsvLine(line);
    const rawSymbol = (cells[iSymbol] ?? "").toUpperCase().replace(/\s+/g, "");
    const quantity = toNumber(cells[iQty]);
    const avgPrice = toNumber(cells[iPrice]);
    if (!rawSymbol || rawSymbol === "TOTAL") return;
    if (!(quantity > 0) || !(avgPrice > 0)) {
      errors.push(`Row ${idx + 2}: skipped ${rawSymbol}, quantity and average price must be positive numbers.`);
      return;
    }

    let symbol = rawSymbol.replace(/-(EQ|BE)$/, "");
    const exchange = iExchange >= 0 ? (cells[iExchange] ?? "").toUpperCase() : "";
    if (!/[.^=]/.test(symbol)) {
      if (exchange === "BSE") symbol += ".BO";
      else if (exchange === "NSE" || format === "zerodha") symbol += ".NS";
    }

    const prev = merged.get(symbol);
    if (prev) {
      const qty = prev.quantity + quantity;
      merged.set(symbol, { symbol, quantity: qty, avgPrice: (prev.quantity * prev.avgPrice + quantity * avgPrice) / qty });
    } else {
      merged.set(symbol, { symbol, quantity, avgPrice });
    }
  });

  return { holdings: [...merged.values()], errors, format };
}

export const CSV_TEMPLATE = "symbol,quantity,avg_price\nRELIANCE.NS,10,2450\nINFY.NS,25,1520.5\nAAPL,5,185\n";
