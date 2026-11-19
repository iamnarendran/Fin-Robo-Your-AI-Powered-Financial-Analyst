import type { Article } from "./moves";
import type { CompactQuote, MarketSnapshot } from "./market-data";

/** The written part of a brief, whether the AI or the template produced it. */
export type BriefText = {
  headline: string;
  summary: string;
  keyPoints: { title: string; detail: string }[];
  watch: string[];
};

const pct = (v: number | null | undefined) => (v == null ? "flat" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
/** "rose 0.82%" / "fell 0.72%" / "was flat": the verb carries the sign. */
const moved = (v: number | null | undefined) =>
  v == null || Math.abs(v) < 0.05 ? "was flat" : `${v > 0 ? "rose" : "fell"} ${Math.abs(v).toFixed(2)}%`;
const find = (qs: CompactQuote[], symbol: string) => qs.find((q) => q.symbol === symbol);

/**
 * Deterministic brief built only from the numbers. Used when no AI key is
 * configured or the AI call fails, so the brief page never breaks.
 */
export function templateBrief(data: MarketSnapshot, headlines: Article[]): BriefText {
  const nifty = find(data.indices, "^NSEI");
  const sensex = find(data.indices, "^BSESN");
  const bank = find(data.indices, "^NSEBANK");
  const it = find(data.indices, "^CNXIT");
  const spx = find(data.global, "^GSPC");
  const usdinr = find(data.global, "INR=X");
  const { advancing, declining } = data.breadth;
  const mood = (nifty?.changePercent ?? 0) > 0.3 ? "Gains" : (nifty?.changePercent ?? 0) < -0.3 ? "Losses" : "A quiet session";

  const keyPoints: BriefText["keyPoints"] = [];
  if (bank && it) {
    const leader = (bank.changePercent ?? 0) >= (it.changePercent ?? 0) ? bank : it;
    const laggard = leader === bank ? it : bank;
    keyPoints.push({
      title: "Sector split",
      detail: `${leader.name} ${pct(leader.changePercent)} outpaced ${laggard.name} ${pct(laggard.changePercent)}.`,
    });
  }
  if (data.gainers[0] || data.losers[0]) {
    const g = data.gainers[0];
    const l = data.losers[0];
    keyPoints.push({
      title: "Biggest movers",
      detail: [g && `${g.name} led gains (${pct(g.changePercent)})`, l && `${l.name} fell the most (${pct(l.changePercent)})`].filter(Boolean).join("; ") + ".",
    });
  }
  if (spx || usdinr) {
    keyPoints.push({
      title: "Global cues",
      detail: [spx && `S&P 500 ${pct(spx.changePercent)}`, usdinr && `rupee at ${usdinr.price?.toFixed(2)} per dollar (${pct(usdinr.changePercent)})`].filter(Boolean).join(", ") + ".",
    });
  }

  return {
    headline: `${mood} for Indian stocks: NIFTY 50 ${pct(nifty?.changePercent)}`,
    summary: `The NIFTY 50 ${moved(nifty?.changePercent)} and the SENSEX ${moved(sensex?.changePercent)}. Breadth was ${advancing >= declining ? "positive" : "negative"}, with ${advancing} NIFTY stocks advancing and ${declining} declining.`,
    keyPoints,
    watch: headlines.slice(0, 2).map((h) => h.title),
  };
}
