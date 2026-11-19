"use client";

import { Sparkles, Star, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChangePill } from "@/components/market/change-pill";
import { POPULAR_SEARCHES, displaySymbol } from "@/lib/markets";
import { useHydrated, usePortfolio } from "@/lib/portfolio-store";
import type { Quote } from "@/lib/types";
import { formatCompact, formatPrice, formatVolume } from "@/lib/utils";

export function WatchlistPage() {
  const hydrated = useHydrated();
  const { watchlist, toggleWatch } = usePortfolio();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [error, setError] = useState(false);
  const key = watchlist.join(",");

  useEffect(() => {
    if (!hydrated || !key) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(key)}`, { signal: controller.signal });
        if (!res.ok) throw new Error();
        setQuotes(await res.json());
        setError(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [key, hydrated]);

  const rows = (quotes ?? []).filter((q) => watchlist.includes(q.symbol));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Watchlist</h1>
          <p className="text-sm text-muted-foreground">Prices refresh every minute. Saved in this browser.</p>
        </div>
        {watchlist.length > 0 && (
          <Link
            href={`/ask?q=${encodeURIComponent("How is my watchlist doing today?")}`}
            className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground sm:self-auto"
          >
            <Sparkles className="size-4" aria-hidden="true" /> Ask about my watchlist
          </Link>
        )}
      </div>

      {hydrated && watchlist.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Star className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 font-medium">Your watchlist is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap “Watch” on any stock page, or start with a popular one:</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {POPULAR_SEARCHES.slice(0, 6).map((p) => (
              <button
                key={p.symbol}
                type="button"
                onClick={() => toggleWatch(p.symbol)}
                className="rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              >
                + {displaySymbol(p.symbol)}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="rounded-xl border border-down/30 bg-down-soft/40 p-4 text-sm">Couldn’t load prices right now.</p>}

      {watchlist.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-normal">Stock</th>
                <th className="px-2 py-2.5 text-right font-normal">Price</th>
                <th className="px-2 py-2.5 text-right font-normal">Today</th>
                <th className="px-2 py-2.5 text-right font-normal">Volume</th>
                <th className="px-2 py-2.5 text-right font-normal">Market cap</th>
                <th className="w-10 px-2 py-2.5"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotes === null
                ? watchlist.map((s) => (
                    <tr key={s}>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="skeleton h-5 w-full" />
                      </td>
                    </tr>
                  ))
                : rows.map((q) => (
                    <tr key={q.symbol}>
                      <td className="px-4 py-2.5">
                        <Link href={`/stock/${encodeURIComponent(q.symbol)}`} className="font-medium hover:underline">
                          {displaySymbol(q.symbol)}
                        </Link>
                        <div className="max-w-56 truncate text-xs text-muted-foreground">{q.name}</div>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular">{formatPrice(q.price, q.currency)}</td>
                      <td className="px-2 py-2.5 text-right">
                        <ChangePill value={q.changePercent} />
                      </td>
                      <td className="px-2 py-2.5 text-right tabular">{formatVolume(q.volume)}</td>
                      <td className="px-2 py-2.5 text-right tabular">{q.marketCap ? formatCompact(q.marketCap, q.currency) : "—"}</td>
                      <td className="px-2 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => toggleWatch(q.symbol)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`Remove ${displaySymbol(q.symbol)} from watchlist`}
                        >
                          <X className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
