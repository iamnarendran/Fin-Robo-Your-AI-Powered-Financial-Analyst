"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, KeyRound, Settings2, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useAiSettings } from "@/lib/ai/settings-store";
import type { ProviderChoice } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ProviderChoice; title: string; description: string }[] = [
  { value: "default", title: "Fin-Robo free", description: "Shared key, no setup. Limited requests per hour." },
  { value: "google", title: "Your Gemini key", description: "Free from Google AI Studio. Unlimited for you." },
  { value: "openrouter", title: "Your OpenRouter key", description: "Use any model, including free ones." },
];

const subscribe = () => () => {};
/** Avoid hydration mismatch: persisted settings only exist on the client. */
function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function useActiveModelLabel() {
  const hydrated = useHydrated();
  const { provider, googleKey, openrouterKey, googleModel, openrouterModel } = useAiSettings();
  if (!hydrated) return "Fin-Robo free";
  if (provider === "google" && googleKey) return googleModel || "Your Gemini key";
  if (provider === "openrouter" && openrouterKey) return openrouterModel || "Your OpenRouter key";
  return "Fin-Robo free";
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring";

export function SettingsDialog() {
  const s = useAiSettings();
  const label = useActiveModelLabel();

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Settings2 className="size-3.5" aria-hidden="true" />
          <span className="max-w-40 truncate">{label}</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-semibold">AI settings</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Keys stay in this browser and are sent only with your own requests.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <fieldset className="mt-5 space-y-2">
            <legend className="sr-only">Provider</legend>
            {OPTIONS.map((o) => (
              <label
                key={o.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  s.provider === o.value ? "border-ring bg-muted/50" : "hover:bg-muted/30",
                )}
              >
                <input
                  type="radio"
                  name="provider"
                  value={o.value}
                  checked={s.provider === o.value}
                  onChange={() => s.set({ provider: o.value })}
                  className="mt-1 accent-current"
                />
                <span>
                  <span className="block text-sm font-medium">{o.title}</span>
                  <span className="block text-xs text-muted-foreground">{o.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {s.provider === "google" && (
            <div className="mt-5 space-y-4">
              <Field
                label="Gemini API key"
                hint={
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                    Get a free key <ExternalLink className="size-3" />
                  </a>
                }
              >
                <input type="password" autoComplete="off" value={s.googleKey} onChange={(e) => s.set({ googleKey: e.target.value })} placeholder="AIza…" className={inputClass} />
              </Field>
              <Field label="Model (optional)" hint="Leave empty for the latest Gemini Flash.">
                <input value={s.googleModel} onChange={(e) => s.set({ googleModel: e.target.value })} placeholder="gemini-flash-latest" className={inputClass} />
              </Field>
            </div>
          )}

          {s.provider === "openrouter" && (
            <div className="mt-5 space-y-4">
              <Field
                label="OpenRouter API key"
                hint={
                  <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                    Get a key <ExternalLink className="size-3" />
                  </a>
                }
              >
                <input type="password" autoComplete="off" value={s.openrouterKey} onChange={(e) => s.set({ openrouterKey: e.target.value })} placeholder="sk-or-…" className={inputClass} />
              </Field>
              <Field
                label="Model (optional)"
                hint={
                  <>
                    Must support tool calling.{" "}
                    <a href="https://openrouter.ai/models?supported_parameters=tools&max_price=0" target="_blank" rel="noreferrer" className="underline">
                      Browse free models
                    </a>
                  </>
                }
              >
                <input value={s.openrouterModel} onChange={(e) => s.set({ openrouterModel: e.target.value })} placeholder="openai/gpt-oss-120b:free" className={inputClass} />
              </Field>
            </div>
          )}

          <p className="mt-5 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <KeyRound className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Your key is stored only in this browser’s local storage. Fin-Robo’s server forwards it to the provider for your requests and never saves it.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
