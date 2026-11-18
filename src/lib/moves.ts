import type { Candle } from "./types";

/**
 * Detect unusual daily price moves and link them to news.
 *
 * A move is "unusual" when its daily return is large relative to the stock's
 * own volatility (|z| ≥ 2) and big in absolute terms. Comparing against a
 * benchmark (NIFTY 50 / S&P 500) separates stock-specific news from days when
 * the whole market moved.
 */

export type Tone = "positive" | "negative" | "neutral";

export type Article = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** Epoch milliseconds. */
  publishedAt: number;
  tone: Tone;
};

export type Move = {
  /** Candle time, epoch seconds. */
  time: number;
  /** UTC calendar date of the session, YYYY-MM-DD. */
  date: string;
  changePct: number;
  zScore: number;
  benchmarkChangePct: number | null;
  /** changePct minus benchmarkChangePct. */
  relativePct: number | null;
  kind: "stock-specific" | "market-wide" | "unknown";
  /** True for flagged unusual moves; false for the latest session included for context. */
  unusual: boolean;
  articleIds: string[];
};

export const dateKey = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Headline tone                                                       */
/* ------------------------------------------------------------------ */

const POSITIVE = /\b(surge[sd]?|soar(s|ed)?|jump(s|ed)?|rall(y|ies|ied)|gain(s|ed)?|rise[sn]?|rose|climb(s|ed)?|beat(s)?|record high|upgrade[sd]?|outperform|bullish|profit (rises|jumps|up)|strong|wins?|bags|order win|buyback|dividend|top gainer|hits? (52-week|record|all-time) high)\b/i;
const NEGATIVE = /\b(plunge[sd]?|slump(s|ed)?|tumble[sd]?|crash(es|ed)?|fall(s|en)?|fell|drop(s|ped)?|decline[sd]?|slide[sd]?|sink(s)?|sank|miss(es|ed)?|downgrade[sd]?|underperform|bearish|loss(es)?|weak|probe|penalty|fine[sd]?|raid|lawsuit|sell-?off|top loser|hits? (52-week|record) low|cuts? (guidance|outlook|target))\b/i;

/** Keyword-based headline tone. Deliberately simple and explainable. */
export function headlineTone(title: string): Tone {
  const pos = POSITIVE.test(title);
  const neg = NEGATIVE.test(title);
  if (pos && !neg) return "positive";
  if (neg && !pos) return "negative";
  return "neutral";
}

/* ------------------------------------------------------------------ */
/* Move detection                                                      */
/* ------------------------------------------------------------------ */

export type DetectOptions = {
  zThreshold?: number;
  /** Minimum absolute daily move, in percent. */
  minAbsPct?: number;
  /** Only report moves within this many most recent sessions. */
  lookbackSessions?: number;
};

export function detectMoves(candles: Candle[], options: DetectOptions = {}): Omit<Move, "benchmarkChangePct" | "relativePct" | "kind" | "articleIds">[] {
  const { zThreshold = 2, minAbsPct = 1.5, lookbackSessions = candles.length } = options;
  if (candles.length < 21) return [];

  const returns = candles.slice(1).map((c, i) => (c.close / candles[i].close - 1) * 100);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const sd = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1)) || 1;

  const start = Math.max(1, candles.length - lookbackSessions);
  const moves = [];
  for (let i = start; i < candles.length; i++) {
    const changePct = returns[i - 1];
    const zScore = (changePct - mean) / sd;
    if (Math.abs(zScore) >= zThreshold && Math.abs(changePct) >= minAbsPct) {
      moves.push({ time: candles[i].time, date: dateKey(candles[i].time), changePct, zScore, unusual: true });
    }
  }
  return moves;
}

/* ------------------------------------------------------------------ */
/* Linking                                                             */
/* ------------------------------------------------------------------ */

/**
 * News published after the previous session's close and before the evening
 * of the move day is a candidate explanation for that move.
 */
function windowFor(candles: Candle[], time: number): [number, number] | null {
  const i = candles.findIndex((c) => c.time === time);
  if (i <= 0) return null;
  const SIX_HOURS = 6 * 3600;
  return [(candles[i - 1].time + SIX_HOURS) * 1000, (candles[i].time + 20 * 3600) * 1000];
}

export function buildTimeline({
  candles,
  articles,
  benchmark,
  lookbackSessions = 22,
  maxMoves = 6,
}: {
  candles: Candle[];
  articles: Article[];
  benchmark?: Candle[];
  lookbackSessions?: number;
  maxMoves?: number;
}): Move[] {
  const benchByDate = new Map<string, number>();
  if (benchmark && benchmark.length > 1) {
    for (let i = 1; i < benchmark.length; i++) {
      benchByDate.set(dateKey(benchmark[i].time), (benchmark[i].close / benchmark[i - 1].close - 1) * 100);
    }
  }

  const detected = detectMoves(candles, { lookbackSessions });

  // Always include the latest session so "why did it move today?" has an answer.
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  if (last && prev && !detected.some((m) => m.time === last.time)) {
    detected.push({ time: last.time, date: dateKey(last.time), changePct: (last.close / prev.close - 1) * 100, zScore: 0, unusual: false });
  }

  return detected
    .sort((a, b) => b.time - a.time)
    .slice(0, maxMoves)
    .map((m) => {
      const benchmarkChangePct = benchByDate.get(m.date) ?? null;
      const relativePct = benchmarkChangePct == null ? null : m.changePct - benchmarkChangePct;
      let kind: Move["kind"] = "unknown";
      // Tiny moves are noise: don't label a -0.1% day "stock-specific".
      const meaningful = m.unusual || Math.abs(m.changePct) >= 1;
      if (meaningful && relativePct != null && benchmarkChangePct != null) {
        const sameDirection = Math.sign(benchmarkChangePct) === Math.sign(m.changePct);
        kind = sameDirection && Math.abs(benchmarkChangePct) >= Math.abs(m.changePct) * 0.6 ? "market-wide" : "stock-specific";
      }

      const window = windowFor(candles, m.time);
      const articleIds = window
        ? articles
            .filter((a) => a.publishedAt >= window[0] && a.publishedAt <= window[1])
            // Prefer headlines whose tone agrees with the move's direction.
            .sort((a, b) => toneScore(b, m.changePct) - toneScore(a, m.changePct) || b.publishedAt - a.publishedAt)
            .slice(0, 3)
            .map((a) => a.id)
        : [];

      return { ...m, benchmarkChangePct, relativePct, kind, articleIds };
    });
}

function toneScore(a: Article, changePct: number) {
  if (a.tone === "neutral") return 0;
  return (a.tone === "positive") === changePct > 0 ? 1 : -1;
}

/** Normalised title used to de-duplicate the same story from several feeds. */
export function titleKey(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, 70);
}
