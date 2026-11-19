import "server-only";

import { generateText, Output } from "ai";
import { cacheLife } from "next/cache";
import { z } from "zod";
import { resolveModel } from "./ai/model";
import { templateBrief, type BriefText } from "./brief-template";
import { getMarketSnapshot, type MarketSnapshot } from "./market-data";
import type { Article } from "./moves";
import { getNews } from "./news";

/**
 * The daily market brief. Generated at most about once an hour from live
 * data and cached, so the AI cost doesn't grow with traffic and no database
 * is needed. It falls back to a template brief, so the page never breaks.
 */

export type DailyBrief = {
  text: BriefText;
  data: MarketSnapshot;
  headlines: Article[];
  source: "ai" | "template";
  model: string | null;
  generatedAt: number;
};

const briefSchema = z.object({
  headline: z.string().describe("One line, max 90 characters, states the day's main story with a number"),
  summary: z.string().describe("2-3 sentences: how Indian markets did and why, using the data"),
  keyPoints: z
    .array(z.object({ title: z.string().describe("2-4 words"), detail: z.string().describe("One sentence with specific numbers") }))
    .min(2)
    .max(4),
  watch: z.array(z.string()).min(1).max(3).describe("Things to watch next, grounded in the headlines"),
});

const INSTRUCTIONS = `You write Fin-Robo's daily market brief for Indian retail investors.
Use ONLY the JSON data provided: never invent numbers, events or reasons. If headlines don't explain a move, don't speculate.
Lead with Indian markets (NIFTY 50, SENSEX, sector indices, breadth, top movers), then global cues (US markets, USD/INR, crude, gold).
Plain, calm English. Percentages to two decimals. Use ₹ for Indian prices. No buy/sell/hold advice, no predictions.`;

async function writeWithAi(data: MarketSnapshot, headlines: Article[]): Promise<{ text: BriefText; model: string } | null> {
  if (process.env.FINROBO_MOCK === "1") return null;
  const resolved = resolveModel(new Headers());
  if (!resolved.ok) return null;
  try {
    const { output } = await generateText({
      model: resolved.model,
      instructions: INSTRUCTIONS,
      prompt: JSON.stringify({
        date: new Date().toLocaleDateString("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }),
        ...data,
        headlines: headlines.map((h) => ({ title: h.title, publisher: h.publisher, tone: h.tone })),
      }),
      output: Output.object({ schema: briefSchema }),
      temperature: 0.3,
      abortSignal: AbortSignal.timeout(30_000),
    });
    return { text: output, model: resolved.label };
  } catch (error) {
    console.error("[brief]", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function getDailyBrief(): Promise<DailyBrief> {
  "use cache";

  const [data, headlines] = await Promise.all([getMarketSnapshot(), getNews("^NSEI", "NIFTY 50").catch(() => [] as Article[])]);
  const top = headlines.slice(0, 6);
  const ai = await writeWithAi(data, top);

  // A template brief is only a stopgap: retry the AI sooner.
  if (ai) cacheLife("hours");
  else cacheLife("minutes");

  return {
    text: ai?.text ?? templateBrief(data, top),
    data,
    headlines: top,
    source: ai ? "ai" : "template",
    model: ai?.model ?? null,
    generatedAt: Date.now(),
  };
}
