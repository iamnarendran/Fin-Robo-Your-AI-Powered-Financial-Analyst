"use client";

import { Download, FileUp, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PortfolioAnalysis } from "@/lib/portfolio-data";
import { CSV_TEMPLATE, parseHoldingsCsv } from "@/lib/portfolio";
import { useHydrated, usePortfolio } from "@/lib/portfolio-store";
import { Allocation, Flags, PositionsTable, SummaryStats } from "./portfolio-view";
import { SymbolPicker } from "./symbol-picker";

const button =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium transition-colors hover:border-ring focus-visible:outline-2 focus-visible:outline-ring";

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function AddHolding() {
  const upsert = usePortfolio((s) => s.upsertHolding);
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [pickerKey, setPickerKey] = useState(0);
  const valid = /^[\w.^=&-]{1,24}$/.test(symbol) && Number(quantity) > 0 && Number(avgPrice) > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        upsert({ symbol, quantity: Number(quantity), avgPrice: Number(avgPrice) });
        setSymbol("");
        setQuantity("");
        setAvgPrice("");
        setPickerKey((k) => k + 1);
      }}
      className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
    >
      <label className="space-y-1.5" htmlFor="holding-symbol">
        <span className="text-xs font-medium text-muted-foreground">Stock</span>
        <SymbolPicker key={pickerKey} id="holding-symbol" value={symbol} onChange={setSymbol} />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Quantity</span>
        <input type="number" min="0" step="any" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring" />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Avg buy price</span>
        <input type="number" min="0" step="any" inputMode="decimal" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring" />
      </label>
      <button type="submit" disabled={!valid} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40">
        <Plus className="size-4" aria-hidden="true" /> Add
      </button>
    </form>
  );
}

function ImportExport() {
  const { holdings, importHoldings, clearHoldings } = usePortfolio();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function onFile(file: File) {
    const text = await file.text();
    if (file.name.endsWith(".json")) {
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data?.holdings)) throw new Error();
        const valid = (data.holdings as Record<string, unknown>[]).filter(
          (h) => typeof h.symbol === "string" && /^[\w.^=&-]{1,24}$/.test(h.symbol) && Number(h.quantity) > 0 && Number(h.avgPrice) > 0,
        );
        importHoldings(valid.map((h) => ({ symbol: String(h.symbol).toUpperCase(), quantity: Number(h.quantity), avgPrice: Number(h.avgPrice) })), "replace");
        setMessage({ tone: "ok", text: `Restored ${valid.length} holdings from backup.` });
      } catch {
        setMessage({ tone: "error", text: "That JSON file isn't a Fin-Robo backup." });
      }
      return;
    }
    const result = parseHoldingsCsv(text);
    if (result.holdings.length) importHoldings(result.holdings, "merge");
    setMessage({
      tone: result.holdings.length ? "ok" : "error",
      text: result.holdings.length
        ? `Imported ${result.holdings.length} holding${result.holdings.length === 1 ? "" : "s"}${result.format === "zerodha" ? " from Zerodha" : ""}.${result.errors.length ? ` ${result.errors.length} row(s) skipped.` : ""}`
        : result.errors[0] ?? "Nothing to import.",
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={() => fileRef.current?.click()}>
          <FileUp className="size-4" aria-hidden="true" /> Import CSV
        </button>
        <button type="button" className={button} onClick={() => download("finrobo-template.csv", CSV_TEMPLATE, "text/csv")}>
          <Download className="size-4" aria-hidden="true" /> CSV template
        </button>
        {holdings.length > 0 && (
          <>
            <button type="button" className={button} onClick={() => download("finrobo-portfolio.json", JSON.stringify({ version: 1, holdings }, null, 2), "application/json")}>
              <Download className="size-4" aria-hidden="true" /> Backup
            </button>
            <button
              type="button"
              className={`${button} text-down`}
              onClick={() => {
                if (confirm("Remove all holdings from this browser?")) clearHoldings();
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" /> Clear
            </button>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {message && <p role="status" className={message.tone === "ok" ? "text-sm text-up" : "text-sm text-down"}>{message.text}</p>}
      <p className="text-xs text-muted-foreground">
        Supports Zerodha Kite/Console holdings exports, or the template (symbol, quantity, avg_price). Use .NS for NSE stocks.
      </p>
    </div>
  );
}

export function PortfolioPage() {
  const hydrated = useHydrated();
  const { holdings, removeHolding } = usePortfolio();
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  // Re-price whenever the holdings change.
  const key = JSON.stringify(holdings);
  useEffect(() => {
    if (!hydrated || holdings.length === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch("/api/portfolio", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ holdings }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        setAnalysis(await res.json());
        setStatus("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated]);

  const empty = hydrated && holdings.length === 0;
  const shown = holdings.length === 0 ? null : analysis;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Portfolio</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden="true" /> Stored only in this browser. No account, no database.
          </p>
        </div>
        {holdings.length > 0 && (
          <Link
            href="/ask?q=Review%20my%20portfolio"
            className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground sm:self-auto"
          >
            <Sparkles className="size-4" aria-hidden="true" /> Review with AI
          </Link>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Add holdings</h2>
        <AddHolding />
        <ImportExport />
      </section>

      {empty && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No holdings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add a stock above or import your Zerodha holdings CSV to see P&L, allocation and risk flags.</p>
        </div>
      )}

      {status === "error" && <p className="rounded-xl border border-down/30 bg-down-soft/40 p-4 text-sm">Couldn’t price your holdings right now. Try again in a minute.</p>}

      {holdings.length > 0 && !shown && status !== "error" && (
        <div className="space-y-3" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 rounded-xl" />
            ))}
          </div>
          <div className="skeleton h-64 rounded-xl" />
        </div>
      )}

      {shown && (
        <div className={status === "loading" ? "space-y-8 opacity-60 transition-opacity" : "space-y-8 transition-opacity"}>
          <SummaryStats s={shown} />
          {shown.missing.length > 0 && (
            <p className="text-sm text-muted-foreground">
              No price data for {shown.missing.join(", ")}. Check the ticker (Indian stocks need .NS).
            </p>
          )}
          <section className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">Allocation</h2>
            <Allocation s={shown} />
          </section>
          <section className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">Risk check</h2>
            <Flags s={shown} />
          </section>
          <section className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">Holdings</h2>
            <PositionsTable s={shown} onRemove={removeHolding} />
          </section>
        </div>
      )}
    </div>
  );
}
