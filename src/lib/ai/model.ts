import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { createMockModel } from "./mock-model";
import { SETTINGS_HEADERS, type ProviderChoice } from "./types";

/**
 * Picks the model for a request.
 *
 * - "default": Fin-Robo's own key from env, so visitors can use the app with
 *   zero setup. Rate limited per IP.
 * - "google" / "openrouter": the visitor's own key (BYOK), sent per request
 *   from their browser and never stored server-side. Not rate limited.
 *
 * Model IDs are env-configurable because free-tier model names change often.
 */

const DEFAULT_GEMINI_MODEL = process.env.FINROBO_GEMINI_MODEL ?? "gemini-flash-latest";
const DEFAULT_OPENROUTER_MODEL = process.env.FINROBO_OPENROUTER_MODEL ?? "openai/gpt-oss-120b:free";

export type ResolvedModel =
  | { ok: true; model: LanguageModel; label: string; usesServerKey: boolean }
  | { ok: false; status: number; error: string };

const MODEL_ID = /^[\w.:/-]{1,100}$/;

export function resolveModel(headers: Headers): ResolvedModel {
  if (process.env.FINROBO_MOCK === "1") {
    return { ok: true, model: createMockModel(), label: "Demo model", usesServerKey: false };
  }

  const provider = (headers.get(SETTINGS_HEADERS.provider) ?? "default") as ProviderChoice;
  const userKey = headers.get(SETTINGS_HEADERS.key)?.trim();
  const requestedModel = headers.get(SETTINGS_HEADERS.model)?.trim();
  const modelId = requestedModel && MODEL_ID.test(requestedModel) ? requestedModel : undefined;

  if (provider === "google") {
    if (!userKey) return { ok: false, status: 400, error: "Add your Gemini API key in AI settings." };
    const google = createGoogleGenerativeAI({ apiKey: userKey });
    const id = modelId ?? DEFAULT_GEMINI_MODEL;
    return { ok: true, model: google(id), label: id, usesServerKey: false };
  }

  if (provider === "openrouter") {
    if (!userKey) return { ok: false, status: 400, error: "Add your OpenRouter API key in AI settings." };
    const openrouter = createOpenRouter({ apiKey: userKey });
    const id = modelId ?? DEFAULT_OPENROUTER_MODEL;
    return { ok: true, model: openrouter(id), label: id, usesServerKey: false };
  }

  // Fin-Robo's shared key: Gemini first, OpenRouter as fallback.
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    return { ok: true, model: google(DEFAULT_GEMINI_MODEL), label: DEFAULT_GEMINI_MODEL, usesServerKey: true };
  }
  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    return { ok: true, model: openrouter(DEFAULT_OPENROUTER_MODEL), label: DEFAULT_OPENROUTER_MODEL, usesServerKey: true };
  }

  return {
    ok: false,
    status: 503,
    error: "The shared AI key isn't configured on this deployment. Add your own free Gemini or OpenRouter key in AI settings.",
  };
}
