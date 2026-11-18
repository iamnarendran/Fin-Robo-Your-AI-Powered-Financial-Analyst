"use client";

import { Search, Sparkles } from "lucide-react";
import Markdown from "react-markdown";
import type { ChatMessage, ChatPart } from "@/lib/ai/types";
import { displaySymbol } from "@/lib/markets";
import { ToolError, ToolLoading } from "./cards/card-shell";
import { ComparisonCard } from "./cards/comparison-card";
import { ExplainerCard } from "./cards/explainer-card";
import { MarketSnapshotCard, QuotesCard } from "./cards/market-cards";
import { MoveCard } from "./cards/move-card";
import { StockAnalysisCard } from "./cards/stock-analysis-card";

const short = (symbols?: (string | undefined)[]) => (symbols ?? []).filter(Boolean).map((s) => displaySymbol(s!)).join(", ");

type Source = { title: string; url: string; publisher: string };

/** Turn "[3]" or "[1, 4]" into links to the matching tool-returned article. */
function linkCitations(text: string, sources: Map<string, Source>) {
  if (sources.size === 0) return text;
  return text.replace(/\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\](?!\()/g, (match, list: string) => {
    const ids = list.split(",").map((n) => n.trim());
    if (!ids.every((id) => sources.has(id))) return match;
    return ids.map((id) => `[${id}](<${sources.get(id)!.url}> "cite:${id}")`).join("");
  });
}

function MarkdownText({ text, sources }: { text: string; sources: Map<string, Source> }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
      <Markdown
        components={{
          a: ({ href, title, children }) => {
            const cite = title?.startsWith("cite:") ? sources.get(title.slice(5)) : undefined;
            if (cite) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  title={`${cite.title} (${cite.publisher})`}
                  className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded bg-muted px-1 align-middle text-[10px] font-medium tabular text-muted-foreground no-underline transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {children}
                </a>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" className="underline">
                {children}
              </a>
            );
          },
        }}
      >
        {linkCitations(text, sources)}
      </Markdown>
    </div>
  );
}

/** Maps each message part to the UI the tool deserves. */
function Part({ part, sources }: { part: ChatPart; sources: Map<string, Source> }) {
  switch (part.type) {
    case "text":
      return part.text ? <MarkdownText text={part.text} sources={sources} /> : null;

    case "tool-explainPriceMoves":
      if (part.state === "output-available") return <MoveCard data={part.output} />;
      if (part.state === "output-error") return <ToolError message={part.errorText} />;
      return <ToolLoading label={`Matching ${short([part.input?.symbol]) || "price"} moves to the news…`} />;

    case "tool-searchSymbol":
      if (part.state !== "output-available") return null;
      return (
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Search className="size-3" aria-hidden="true" />
          Looked up “{part.output.query}”
          {part.output.results[0] && <> → {displaySymbol(part.output.results[0].symbol)}</>}
        </div>
      );

    case "tool-analyzeStock":
      if (part.state === "output-available") return <StockAnalysisCard data={part.output} />;
      if (part.state === "output-error") return <ToolError message={part.errorText} />;
      return <ToolLoading label={`Analysing ${short([part.input?.symbol]) || "stock"}…`} />;

    case "tool-compareStocks":
      if (part.state === "output-available") return <ComparisonCard data={part.output} />;
      if (part.state === "output-error") return <ToolError message={part.errorText} />;
      return <ToolLoading label={`Comparing ${short(part.input?.symbols) || "stocks"}…`} />;

    case "tool-getQuotes":
      if (part.state === "output-available") return <QuotesCard data={part.output} />;
      if (part.state === "output-error") return <ToolError message={part.errorText} />;
      return <ToolLoading label="Fetching prices…" />;

    case "tool-getMarketOverview":
      if (part.state === "output-available") return <MarketSnapshotCard data={part.output} />;
      if (part.state === "output-error") return <ToolError message={part.errorText} />;
      return <ToolLoading label="Reading the market…" />;

    case "tool-explainConcept":
      if (part.state === "output-error") return <ToolError message={part.errorText} />;
      if (part.state === "output-available") return <ExplainerCard {...part.output} />;
      // The explainer fills in live as the model writes it.
      return <ExplainerCard {...(part.input ?? {})} streaming />;

    default:
      return null;
  }
}

export function MessageView({
  message,
  isLast,
  isStreaming,
  onFollowUp,
}: {
  message: ChatMessage;
  isLast: boolean;
  isStreaming: boolean;
  onFollowUp: (text: string) => void;
}) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-primary-foreground">{text}</div>
      </div>
    );
  }

  const followUps = message.parts.find((p) => p.type === "tool-suggestFollowUps" && p.state === "output-available");
  const suggestions = followUps?.type === "tool-suggestFollowUps" && followUps.state === "output-available" ? followUps.output.suggestions : [];
  const sources = new Map<string, Source>();
  for (const p of message.parts) {
    if (p.type === "tool-explainPriceMoves" && p.state === "output-available") {
      for (const a of p.output.articles) sources.set(a.id, { title: a.title, url: a.url, publisher: a.publisher });
    }
  }
  const hasContent = message.parts.some((p) => (p.type === "text" && p.text) || (p.type.startsWith("tool-") && p.type !== "tool-suggestFollowUps"));

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {!hasContent && isStreaming && <ToolLoading label="Thinking…" />}
        {message.parts.map((part, i) => (
          <Part key={i} part={part} sources={sources} />
        ))}
        {isLast && !isStreaming && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onFollowUp(s)}
                className="rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
