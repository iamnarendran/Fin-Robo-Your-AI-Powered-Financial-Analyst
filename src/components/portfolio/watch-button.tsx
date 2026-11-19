"use client";

import { Star } from "lucide-react";
import { useHydrated, usePortfolio } from "@/lib/portfolio-store";
import { cn } from "@/lib/utils";

export function WatchButton({ symbol }: { symbol: string }) {
  const hydrated = useHydrated();
  const watching = usePortfolio((s) => s.watchlist.includes(symbol));
  const toggle = usePortfolio((s) => s.toggleWatch);
  const on = hydrated && watching;
  return (
    <button
      type="button"
      onClick={() => toggle(symbol)}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-ring",
        on && "border-ring",
      )}
    >
      <Star className={cn("size-3.5", on ? "fill-brand text-brand" : "text-muted-foreground")} aria-hidden="true" />
      {on ? "Watching" : "Watch"}
    </button>
  );
}
