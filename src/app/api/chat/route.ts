import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream } from "ai";
import type { NextRequest } from "next/server";
import { resolveModel } from "@/lib/ai/model";
import { systemPrompt } from "@/lib/ai/prompt";
import { buildTools } from "@/lib/ai/tools";
import type { ChatMessage } from "@/lib/ai/types";
import { holdingsSchema } from "@/lib/portfolio-data";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const MAX_HISTORY = 16;
const MAX_BODY_BYTES = 200_000;

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: "Conversation too long. Start a new chat." }, { status: 413 });

  let body: { messages?: ChatMessage[]; context?: { symbol?: string; holdings?: unknown; watchlist?: unknown } };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_HISTORY) : [];
  if (messages.length === 0) return Response.json({ error: "No messages" }, { status: 400 });

  const resolved = resolveModel(request.headers);
  if (!resolved.ok) return Response.json({ error: resolved.error }, { status: resolved.status });

  if (resolved.usesServerKey) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const limit = checkRateLimit(ip);
    if (!limit.ok) {
      const minutes = Math.ceil(limit.retryAfterSeconds / 60);
      return Response.json(
        { error: `You've hit the free demo limit. Try again in ${minutes} min, or add your own free Gemini key in AI settings for unlimited use.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
  }

  const symbol = typeof body.context?.symbol === "string" && /^[\w.^=&-]{1,24}$/.test(body.context.symbol) ? body.context.symbol : undefined;

  const holdings = holdingsSchema.safeParse(body.context?.holdings ?? []);
  const watchlist = Array.isArray(body.context?.watchlist)
    ? body.context.watchlist.filter((s): s is string => typeof s === "string" && /^[\w.^=&-]{1,24}$/.test(s)).slice(0, 50)
    : [];
  const tools = buildTools({ holdings: holdings.success ? holdings.data : [], watchlist });

  const result = streamText({
    model: resolved.model,
    instructions: systemPrompt({ symbol, watchlist, hasHoldings: holdings.success && holdings.data.length > 0 }),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: isStepCount(6),
    temperature: 0.3,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: messages,
      onError: (error) => {
        console.error("[chat]", error);
        const message = error instanceof Error ? error.message : String(error);
        if (/api key|unauthori[sz]ed|permission|401|403/i.test(message)) return "The AI provider rejected the API key. Check it in AI settings.";
        if (/quota|rate|429|exhausted/i.test(message)) return "The AI provider's free-tier limit was reached. Try again shortly or switch models in AI settings.";
        if (/not found|404|model/i.test(message)) return "That model isn't available. Pick another one in AI settings.";
        if (/market data|ticker|symbol/i.test(message)) return message;
        return "Something went wrong while analysing. Please try again.";
      },
    }),
  });
}
