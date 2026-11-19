"use client";

import { useRef, useState } from "react";
import { displaySymbol } from "@/lib/markets";
import type { SearchResult } from "@/lib/types";

/** Text input with ticker suggestions from /api/search. */
export function SymbolPicker({ value, onChange, id }: { value: string; onChange: (symbol: string) => void; id: string }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef(0);

  function search(text: string) {
    setQuery(text);
    onChange(text.trim().toUpperCase());
    clearTimeout(timer.current);
    const id = ++request.current;
    if (!text.trim()) return setResults([]);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(text.trim())}`).catch(() => null);
      const data: SearchResult[] = res?.ok ? await res.json() : [];
      if (id === request.current) {
        setResults(data.filter((r) => r.type === "EQUITY" || r.type === "ETF").slice(0, 6));
        setOpen(true);
      }
    }, 200);
  }

  return (
    <div className="relative">
      <input
        id={id}
        value={query}
        onChange={(e) => search(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search: Reliance, INFY, AAPL"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
      />
      {open && results.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-card shadow-lg">
          {results.map((r) => (
            <li key={r.symbol} role="option" aria-selected={value === r.symbol}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(r.symbol);
                  onChange(r.symbol);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="w-24 shrink-0 font-medium">{displaySymbol(r.symbol)}</span>
                <span className="truncate text-muted-foreground">{r.name}</span>
                <span className="ml-auto text-[10px] uppercase text-muted-foreground">{r.exchange}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
