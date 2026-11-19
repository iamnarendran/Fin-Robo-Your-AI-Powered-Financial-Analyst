"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Holding } from "./portfolio";

/**
 * Local-first: the watchlist and holdings live only in this browser
 * (localStorage). They leave it only inside a request the user makes,
 * e.g. pricing the portfolio or asking the AI to review it.
 */
type PortfolioState = {
  watchlist: string[];
  holdings: Holding[];
  toggleWatch: (symbol: string) => void;
  upsertHolding: (h: Holding) => void;
  removeHolding: (symbol: string) => void;
  importHoldings: (hs: Holding[], mode: "merge" | "replace") => void;
  clearHoldings: () => void;
};

export const usePortfolio = create<PortfolioState>()(
  persist(
    (set) => ({
      watchlist: [],
      holdings: [],
      toggleWatch: (symbol) =>
        set((s) => ({
          watchlist: s.watchlist.includes(symbol) ? s.watchlist.filter((x) => x !== symbol) : [symbol, ...s.watchlist].slice(0, 50),
        })),
      upsertHolding: (h) =>
        set((s) => ({ holdings: [h, ...s.holdings.filter((x) => x.symbol !== h.symbol)].slice(0, 50) })),
      removeHolding: (symbol) => set((s) => ({ holdings: s.holdings.filter((x) => x.symbol !== symbol) })),
      importHoldings: (hs, mode) =>
        set((s) => {
          if (mode === "replace") return { holdings: hs.slice(0, 50) };
          const map = new Map(s.holdings.map((h) => [h.symbol, h]));
          for (const h of hs) map.set(h.symbol, h);
          return { holdings: [...map.values()].slice(0, 50) };
        }),
      clearHoldings: () => set({ holdings: [] }),
    }),
    { name: "finrobo-portfolio", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);

const noop = () => () => {};
/** True once the persisted store can be read (avoids hydration mismatches). */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
