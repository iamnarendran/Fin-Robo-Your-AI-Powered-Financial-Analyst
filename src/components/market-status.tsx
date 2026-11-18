"use client";

import { useEffect, useState } from "react";
import { getMarketSessions, type MarketSession } from "@/lib/markets";
import { cn } from "@/lib/utils";

/** Rendered after mount: open/closed depends on the viewer's current time. */
export function MarketStatus({ className }: { className?: string }) {
  const [sessions, setSessions] = useState<MarketSession[] | null>(null);

  useEffect(() => {
    const update = () => setSessions(getMarketSessions());
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!sessions) return <div className={cn("h-7 w-44", className)} aria-hidden="true" />;

  return (
    <div className={cn("items-center gap-3 text-xs text-muted-foreground", className)}>
      {sessions.map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1.5" title={`${s.label} local time ${s.localTime}`}>
          <span className={cn("size-1.5 rounded-full", s.isOpen ? "bg-up" : "bg-muted-foreground/40")} />
          {s.label} {s.isOpen ? "open" : "closed"}
        </span>
      ))}
    </div>
  );
}
