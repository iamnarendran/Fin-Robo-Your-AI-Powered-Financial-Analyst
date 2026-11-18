import "server-only";

import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { GLOBAL_MARKETS, INDIA_INDICES, NIFTY_50, POPULAR_US } from "@/lib/markets";

/**
 * A scripted "analyst" used when FINROBO_MOCK=1. It picks tools from simple
 * keyword rules, so the full generative-UI flow (tool calls → cards → text →
 * follow-ups) can be developed and tested without any API key or network.
 */

type StreamPart = Record<string, unknown>;
type PromptMessage = { role: string; content: unknown };
type ToolResult = { toolName: string; output: { type: string; value: unknown } };

const ALIASES: [RegExp, string][] = [
  [/\bnifty\s*bank\b|\bbank\s*nifty\b/i, "^NSEBANK"],
  [/\bnifty\s*it\b/i, "^CNXIT"],
  [/\bnifty(\s*50)?\b/i, "^NSEI"],
  [/\bsensex\b/i, "^BSESN"],
  [/\bs&p\b|\bsp500\b/i, "^GSPC"],
  [/\bnasdaq\b/i, "^IXIC"],
  [/\bgoogle\b/i, "GOOGL"],
  [/\bzomato\b/i, "ETERNAL.NS"],
];

function findSymbols(text: string) {
  const found: string[] = [];
  for (const [re, symbol] of ALIASES) if (re.test(text)) found.push(symbol);
  for (const i of [...NIFTY_50, ...POPULAR_US, ...INDIA_INDICES, ...GLOBAL_MARKETS]) {
    const ticker = i.symbol.replace(/\.NS$/, "").replace(/[\^=]/g, "\\$&");
    const firstWord = i.name.split(/[\s(]/)[0];
    const re = new RegExp(`\\b(${ticker}|${firstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i");
    if (firstWord.length > 2 && re.test(text) && !found.includes(i.symbol)) found.push(i.symbol);
  }
  return found.slice(0, 5);
}

function lastUserText(prompt: PromptMessage[]) {
  const user = [...prompt].reverse().find((m) => m.role === "user");
  if (!user || !Array.isArray(user.content)) return "";
  return user.content.map((p: { type: string; text?: string }) => (p.type === "text" ? p.text : "")).join(" ");
}

function toolResultsSinceUser(prompt: PromptMessage[]): ToolResult[] {
  const results: ToolResult[] = [];
  for (let i = prompt.length - 1; i >= 0 && prompt[i].role !== "user"; i--) {
    if (prompt[i].role === "tool" && Array.isArray(prompt[i].content)) {
      for (const part of prompt[i].content as ToolResult[]) results.unshift(part);
    }
  }
  return results;
}

let counter = 0;
const id = () => `mock-${Date.now()}-${counter++}`;

function toolCall(toolName: string, input: unknown): StreamPart[] {
  return [{ type: "tool-call", toolCallId: id(), toolName, input: JSON.stringify(input) }];
}

function text(content: string): StreamPart[] {
  const tid = id();
  return [
    { type: "text-start", id: tid },
    ...content.split(/(?<=\s)/).map((delta) => ({ type: "text-delta", id: tid, delta })),
    { type: "text-end", id: tid },
  ];
}

function finish(reason: "stop" | "tool-calls"): StreamPart {
  return {
    type: "finish",
    finishReason: { unified: reason, raw: undefined },
    usage: {
      inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 0, text: 0, reasoning: undefined },
    },
  };
}

const pct = (v: unknown) => (typeof v === "number" ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "n/a");

function narrate(results: ToolResult[]): { prose: string; followUps: string[] } {
  const last = results.filter((r) => r.toolName !== "searchSymbol").pop();
  const v = (last?.output.value ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (last?.toolName) {
    case "analyzeStock":
      return {
        prose: `**${v.name}** is ${pct(v.returnsPct?.["1Y"])} over the past year, with annualised volatility of ${v.volatilityPct}% and a worst peak-to-trough fall of ${v.maxDrawdownPct}%. RSI sits at ${v.rsi14}, so momentum looks ${v.rsi14 >= 70 ? "stretched" : v.rsi14 <= 30 ? "washed out" : "neutral"}.${v.signals?.length ? ` Worth noting: ${String(v.signals[0]).toLowerCase()}.` : ""}\n\n_Demo mode: this summary is scripted. Connect a Gemini key for real analysis._`,
        followUps: [`Compare ${v.symbol?.replace(".NS", "")} with its peers`, `What is RSI?`, `How is the market today?`],
      };
    case "compareStocks": {
      const sorted = [...(v.metrics ?? [])].sort((a, b) => b.returnPct - a.returnPct);
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      return {
        prose: `Over this period **${best?.name}** led with ${pct(best?.returnPct)}, while **${worst?.name}** returned ${pct(worst?.returnPct)}. Look at volatility and drawdown alongside returns: a higher return that came with deeper falls is a bumpier ride.\n\n_Demo mode: this summary is scripted._`,
        followUps: [`Analyse ${best?.symbol?.replace(".NS", "")}`, "What is max drawdown?", "Compare over 5 years"],
      };
    }
    case "getMarketOverview":
      return {
        prose: `Here's today's snapshot. Breadth among NIFTY 50 stocks is ${v.breadth?.advancing} advancing vs ${v.breadth?.declining} declining.\n\n_Demo mode: this summary is scripted._`,
        followUps: ["Why is the top gainer up?", "Compare NIFTY with S&P 500", "What is market breadth?"],
      };
    case "explainConcept":
      return { prose: "", followUps: ["Show me a stock with a low P/E", "What is EPS?", "Analyse TCS"] };
    case "getQuotes":
      return { prose: "Here are the latest prices.", followUps: ["Analyse the first one", "How is the market today?"] };
    default:
      return {
        prose: "I'm Fin-Robo's demo analyst. Ask me to analyse a stock, compare companies, explain a concept, or summarise the market.",
        followUps: ["Analyse Reliance", "Compare TCS and Infosys", "What is a P/E ratio?"],
      };
  }
}

function plan(question: string): StreamPart[] {
  const q = question.toLowerCase();
  const symbols = findSymbols(question);

  if (/\b(what is|what's a|what are|explain|meaning of|define)\b/.test(q) && !/\bprice\b/.test(q)) {
    return toolCall("explainConcept", {
      concept: "P/E ratio",
      summary: "The price-to-earnings ratio compares a company's share price with the profit it earns per share. It tells you how many rupees investors pay for every rupee of annual earnings.",
      keyPoints: [
        "A P/E of 25 means investors pay ₹25 for each ₹1 of yearly profit.",
        "Compare P/E within the same sector: IT and FMCG usually trade higher than banks or metals.",
        "A low P/E can mean good value, or that the market expects profits to fall.",
      ],
      exampleSymbol: symbols[0] ?? "TCS.NS",
    });
  }
  if (symbols.length >= 2 || /\b(compare|vs|versus)\b/.test(q)) {
    const picks = symbols.length >= 2 ? symbols : ["TCS.NS", "INFY.NS"];
    return toolCall("compareStocks", { symbols: picks, range: /5\s*y/.test(q) ? "5y" : "1y" });
  }
  if (symbols.length === 1 && !/\bmarket\b/.test(q)) return toolCall("analyzeStock", { symbol: symbols[0] });
  if (/\b(market|today|nifty|sensex|moved|movers)\b/.test(q)) return toolCall("getMarketOverview", {});
  return [];
}

export function createMockModel() {
  return new MockLanguageModelV4({
    provider: "finrobo-mock",
    modelId: "demo",
    doStream: async ({ prompt }) => {
      const messages = prompt as unknown as PromptMessage[];
      const results = toolResultsSinceUser(messages);
      let chunks: StreamPart[];

      if (results.some((r) => r.toolName === "suggestFollowUps")) {
        chunks = [finish("stop")];
      } else if (results.length === 0) {
        const calls = plan(lastUserText(messages));
        if (calls.length) chunks = [...calls, finish("tool-calls")];
        else {
          const { prose, followUps } = narrate([]);
          chunks = [...text(prose), ...toolCall("suggestFollowUps", { suggestions: followUps }), finish("tool-calls")];
        }
      } else {
        const { prose, followUps } = narrate(results);
        chunks = [...(prose ? text(prose) : []), ...toolCall("suggestFollowUps", { suggestions: followUps }), finish("tool-calls")];
      }

      return {
        stream: simulateReadableStream({ chunks, initialDelayInMs: 250, chunkDelayInMs: 18 }) as never,
      };
    },
  });
}
