"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLES = ["Compare HDFC Bank and ICICI Bank", "How is NIFTY doing today?", "Analyse Tata Motors"];

/** Home-page entry into the analyst: hands the question to /ask. */
export function AskBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const go = (q: string) => q.trim() && router.push(`/ask?q=${encodeURIComponent(q.trim())}`);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-brand" aria-hidden="true" />
        Ask the AI analyst
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="mt-3 flex items-center gap-2 rounded-xl border bg-background p-1.5 pl-3 focus-within:border-ring"
      >
        <label htmlFor="ask-box" className="sr-only">
          Ask about any stock
        </label>
        <input
          id="ask-box"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Is Reliance more volatile than the NIFTY?"
          className="h-9 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          maxLength={1000}
        />
        <button
          type="submit"
          aria-label="Ask"
          className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
          disabled={!value.trim()}
        >
          <ArrowUp className="size-4" />
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => go(q)}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
