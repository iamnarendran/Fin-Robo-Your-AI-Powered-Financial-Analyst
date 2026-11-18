import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { FinRoboTools } from "./tools";

export type ChatMessage = UIMessage<never, UIDataTypes, InferUITools<FinRoboTools>>;
export type ChatPart = ChatMessage["parts"][number];

/** Provider settings the browser sends with each request (BYOK). */
export type ProviderChoice = "default" | "google" | "openrouter";

export const SETTINGS_HEADERS = {
  provider: "x-finrobo-provider",
  key: "x-finrobo-key",
  model: "x-finrobo-model",
} as const;

type UITools = InferUITools<FinRoboTools>;
export type ToolName = keyof UITools;
export type ToolOutput<K extends ToolName> = UITools[K]["output"];
export type ToolInput<K extends ToolName> = UITools[K]["input"];
