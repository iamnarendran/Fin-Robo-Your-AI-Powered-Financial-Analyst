"use client";

import { Command } from "cmdk";
import { Loader2, Search, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { POPULAR_SEARCHES, displaySymbol } from "@/lib/markets";
import type { SearchResult } from "@/lib/types";

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced server search; stale responses are ignored via requestId.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function onQueryChange(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    const id = ++requestId.current;
    const q = value.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data: SearchResult[] = res.ok ? await res.json() : [];
        if (id === requestId.current) setResults(data);
      } catch {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 200);
  }

  const go = (symbol: string) => {
    setOpen(false);
    onQueryChange("");
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  };

  const items = query.trim() ? results : POPULAR_SEARCHES.map((p) => ({ ...p, exchange: p.symbol.endsWith(".NS") ? "NSE" : "US", type: "EQUITY" }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:w-44 lg:w-64"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Search stocks, indices…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Search stocks"
        shouldFilter={false}
        overlayClassName="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        contentClassName="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Command.Input
            value={query}
            onValueChange={onQueryChange}
            placeholder="Search RELIANCE, TCS, Apple, NIFTY…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>
        <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {!loading && query.trim() && (
            <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
              No matches for “{query.trim()}”.
            </Command.Empty>
          )}
          <Command.Group
            heading={query.trim() ? "Results" : "Popular"}
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {items.map((item) => (
              <Command.Item
                key={item.symbol}
                value={item.symbol}
                onSelect={() => go(item.symbol)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-muted"
              >
                <TrendingUp className="size-4 shrink-0 text-muted-foreground" />
                <span className="w-24 shrink-0 font-medium tabular">{displaySymbol(item.symbol)}</span>
                <span className="truncate text-muted-foreground">{item.name}</span>
                <span className="ml-auto shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {item.exchange}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
