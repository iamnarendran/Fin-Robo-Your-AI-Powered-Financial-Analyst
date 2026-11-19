"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, BarChart3, Briefcase, GraduationCap, Globe2, Newspaper, RotateCcw, Scale, Square } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { settingsHeaders } from "@/lib/ai/settings-store";
import { usePortfolio } from "@/lib/portfolio-store";
import type { ChatMessage } from "@/lib/ai/types";
import { displaySymbol } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { MessageView } from "./message";
import { SettingsDialog } from "./settings-dialog";

const STARTERS = [
  { icon: BarChart3, label: "Analyse", prompt: "Analyse Reliance Industries" },
  { icon: Scale, label: "Compare", prompt: "Compare TCS, Infosys and HCL Tech over 1 year" },
  { icon: Globe2, label: "Market", prompt: "How is the Indian market doing today?" },
  { icon: GraduationCap, label: "Learn", prompt: "What is a P/E ratio? Use HDFC Bank as an example" },
  { icon: Briefcase, label: "Portfolio", prompt: "Review my portfolio" },
  { icon: Newspaper, label: "News", prompt: "Why did Infosys move recently?" },
];

/** The API returns `{ error }` JSON; the transport surfaces it as the message text. */
function readError(error: Error) {
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {}
  return error.message || "Something went wrong. Please try again.";
}

export function Chat() {
  const params = useSearchParams();
  const router = useRouter();
  const contextSymbol = params.get("symbol") ?? undefined;
  const initialQuery = params.get("q");

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatMessage>({
        api: "/api/chat",
        headers: () => settingsHeaders(),
        // Holdings and watchlist live in localStorage; they travel only with chat requests.
        body: () => {
          const { holdings, watchlist } = usePortfolio.getState();
          return { context: { symbol: contextSymbol, holdings, watchlist } };
        },
      }),
    [contextSymbol],
  );

  const { messages, sendMessage, status, stop, error, setMessages, clearError, regenerate } = useChat<ChatMessage>({ transport });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentInitial = useRef(false);

  // Deep links like /ask?q=Analyse%20TCS start the conversation immediately.
  useEffect(() => {
    if (initialQuery && !sentInitial.current) {
      sentInitial.current = true;
      sendMessage({ text: initialQuery });
      router.replace(contextSymbol ? `/ask?symbol=${encodeURIComponent(contextSymbol)}` : "/ask", { scroll: false });
    }
  }, [initialQuery, contextSymbol, sendMessage, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    clearError();
    sendMessage({ text: trimmed });
    setInput("");
  }

  function reset() {
    stop();
    setMessages([]);
    clearError();
    inputRef.current?.focus();
  }

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-3xl flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {contextSymbol && (
            <span className="rounded-md border bg-card px-2 py-1 text-xs">
              Context: <span className="font-medium text-foreground">{displaySymbol(contextSymbol)}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!empty && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" /> New chat
            </button>
          )}
          <SettingsDialog />
        </div>
      </div>

      {empty ? (
        <div className="flex flex-1 flex-col justify-center pb-10">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ask Fin-Robo</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            An analyst that answers with live market data: charts, comparisons and explainers, not walls of text.
          </p>
          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            {STARTERS.map(({ icon: Icon, label, prompt }) => (
              <button
                key={prompt}
                type="button"
                onClick={() => send(prompt)}
                className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-ring/60 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
                <span>
                  <span className="block text-xs text-muted-foreground">{label}</span>
                  <span className="block text-sm">{prompt}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-8 pb-6" aria-live="polite">
          {messages.map((m, i) => (
            <MessageView
              key={m.id}
              message={m}
              isLast={i === messages.length - 1}
              isStreaming={busy && i === messages.length - 1}
              onFollowUp={send}
            />
          ))}
          {status === "submitted" && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <span className="size-7 shrink-0 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
              <span className="pt-1 text-sm text-muted-foreground">Thinking…</span>
            </div>
          )}
          {error && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-down/30 bg-down-soft/40 px-4 py-3 text-sm" role="alert">
              <span>{readError(error)}</span>
              <button type="button" onClick={() => regenerate()} className="shrink-0 font-medium underline">
                Retry
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-20 rounded-2xl md:bottom-4 border bg-card p-2 shadow-lg shadow-black/5"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Ask about any stock, index or concept
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={contextSymbol ? `Ask about ${displaySymbol(contextSymbol)}…` : "Ask about any stock, index or concept…"}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground field-sizing-content"
            maxLength={1000}
            autoFocus
          />
          {busy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-colors hover:bg-muted/70"
              aria-label="Stop generating"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity",
                !input.trim() && "opacity-40",
              )}
              aria-label="Send"
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      </form>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Educational analysis from live data, not investment advice. AI can make mistakes.
      </p>
    </div>
  );
}
