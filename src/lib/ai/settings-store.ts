"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SETTINGS_HEADERS, type ProviderChoice } from "./types";

/**
 * AI provider preferences, kept in the browser only (localStorage).
 * Keys are sent per request as headers and never stored on the server.
 */
type AiSettings = {
  provider: ProviderChoice;
  googleKey: string;
  googleModel: string;
  openrouterKey: string;
  openrouterModel: string;
  set: (patch: Partial<Omit<AiSettings, "set">>) => void;
};

export const useAiSettings = create<AiSettings>()(
  persist(
    (set) => ({
      provider: "default",
      googleKey: "",
      googleModel: "",
      openrouterKey: "",
      openrouterModel: "",
      set: (patch) => set(patch),
    }),
    { name: "finrobo-ai-settings", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);

export function settingsHeaders(): Record<string, string> {
  const s = useAiSettings.getState();
  if (s.provider === "google" && s.googleKey) {
    return { [SETTINGS_HEADERS.provider]: "google", [SETTINGS_HEADERS.key]: s.googleKey, ...(s.googleModel && { [SETTINGS_HEADERS.model]: s.googleModel }) };
  }
  if (s.provider === "openrouter" && s.openrouterKey) {
    return { [SETTINGS_HEADERS.provider]: "openrouter", [SETTINGS_HEADERS.key]: s.openrouterKey, ...(s.openrouterModel && { [SETTINGS_HEADERS.model]: s.openrouterModel }) };
  }
  return { [SETTINGS_HEADERS.provider]: "default" };
}
