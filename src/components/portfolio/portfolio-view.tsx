import { AlertTriangle, Info, X } from "lucide-react";
import Link from "next/link";
import type { PortfolioSummary } from "@/lib/portfolio";
import { displaySymbol } from "@/lib/markets";
import { cn, formatCompact, formatPercent, formatPrice, trendClass } from "@/lib/utils";

/** Presentational and hook-free: rendered by the portfolio page and the AI review card. */

const inr = (v: number) => formatCompact(v, "INR");
const signedInr = (v: number) => `${v >= 0 ? "+" : "−"}${formatCompact(Math.abs(v), "INR")}`;

export function Stat({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-xl font-semibold tracking-tight tabular", className)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground tabular">{sub}</div>}
    </div>
  );
}

export function SummaryStats({ s }: { s: PortfolioSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Current value" value={inr(s.valueInr)} sub={`Invested ${inr(s.investedInr)}`} />
      <Stat label="Total P&L" value={signedInr(s.pnlInr)} sub={formatPercent(s.pnlPct)} className={trendClass(s.pnlInr)} />
      <Stat label="Today" value={signedInr(s.dayChangeInr)} sub={formatPercent(s.dayChangePct)} className={trendClass(s.dayChangeInr)} />
      <Stat label="Holdings" value={s.positions.length} sub={`USD/INR ${s.usdInr.toFixed(2)}`} />
    </div>
  );
}

type Slice = { key: string; label: string; weight: number; valueInr: number };

/** One stacked bar plus a legend list; folds everything after five slices into "Other". */
export function AllocationBar({ title, slices }: { title: string; slices: Slice[] }) {
  const top = slices.slice(0, 5);
  const rest = slices.slice(5);
  const shown: (Slice & { colorVar: string })[] = top.map((s, i) => ({ ...s, colorVar: `--series-${i + 1}` }));
  if (rest.length) {
    shown.push({
      key: "other",
      label: `Other (${rest.length})`,
      weight: rest.reduce((a, s) => a + s.weight, 0),
      valueInr: rest.reduce((a, s) => a + s.valueInr, 0),
      colorVar: "--muted-foreground",
    });
  }
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${title}: ${shown.map((s) => `${s.label} ${(s.weight * 100).toFixed(0)}%`).join(", ")}`}>
        {shown.map((s) => (
          <div key={s.key} style={{ width: `${s.weight * 100}%`, background: `var(${s.colorVar})` }} className="min-w-1 first:rounded-l-full last:rounded-r-full" />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {shown.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: `var(${s.colorVar})` }} aria-hidden="true" />
            <span className="truncate">{s.label}</span>
            <span className="ml-auto text-muted-foreground tabular">{inr(s.valueInr)}</span>
            <span className="w-12 text-right font-medium tabular">{(s.weight * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Allocation({ s }: { s: PortfolioSummary }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <AllocationBar
        title="By stock"
        slices={s.positions.map((p) => ({ key: p.symbol, label: `${displaySymbol(p.symbol)} · ${p.name}`, weight: p.weight, valueInr: p.valueInr }))}
      />
      <AllocationBar title="By sector" slices={s.sectors.map((x) => ({ key: x.sector, label: x.sector, weight: x.weight, valueInr: x.valueInr }))} />
    </div>
  );
}

export function Flags({ s }: { s: PortfolioSummary }) {
  if (s.flags.length === 0) {
    return <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No concentration or diversification flags. Nicely spread out.</p>;
  }
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {s.flags.map((f) => {
        const Icon = f.level === "warning" ? AlertTriangle : Info;
        return (
          <li key={f.title} className="flex gap-3 rounded-xl border bg-card p-4">
            <Icon className={cn("mt-0.5 size-4 shrink-0", f.level === "warning" ? "text-brand" : "text-muted-foreground")} aria-hidden="true" />
            <div>
              <div className="text-sm font-medium">
                <span className="sr-only">{f.level === "warning" ? "Warning: " : "Note: "}</span>
                {f.title}
              </div>
              <p className="text-sm text-muted-foreground">{f.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PositionsTable({ s, onRemove }: { s: PortfolioSummary; onRemove?: (symbol: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-normal">Holding</th>
            <th className="px-2 py-2.5 text-right font-normal">Qty</th>
            <th className="px-2 py-2.5 text-right font-normal">Avg cost</th>
            <th className="px-2 py-2.5 text-right font-normal">Price</th>
            <th className="px-2 py-2.5 text-right font-normal">Today</th>
            <th className="px-2 py-2.5 text-right font-normal">P&L</th>
            <th className="px-2 py-2.5 text-right font-normal">Weight</th>
            {onRemove && <th className="w-10 px-2 py-2.5"><span className="sr-only">Remove</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {s.positions.map((p) => (
            <tr key={p.symbol}>
              <td className="px-4 py-2.5">
                <Link href={`/stock/${encodeURIComponent(p.symbol)}`} className="font-medium hover:underline">
                  {displaySymbol(p.symbol)}
                </Link>
                <div className="max-w-48 truncate text-xs text-muted-foreground">{p.name}</div>
              </td>
              <td className="px-2 py-2.5 text-right tabular">{p.quantity.toLocaleString("en-IN")}</td>
              <td className="px-2 py-2.5 text-right tabular">{formatPrice(p.avgPrice, p.currency)}</td>
              <td className="px-2 py-2.5 text-right tabular">{formatPrice(p.price, p.currency)}</td>
              <td className={cn("px-2 py-2.5 text-right tabular", trendClass(p.dayChangePct))}>{formatPercent(p.dayChangePct)}</td>
              <td className={cn("px-2 py-2.5 text-right tabular", trendClass(p.pnlInr))}>
                <div className="font-medium">{signedInr(p.pnlInr)}</div>
                <div className="text-xs">{formatPercent(p.pnlPct, 1)}</div>
              </td>
              <td className="px-2 py-2.5 text-right tabular">{(p.weight * 100).toFixed(1)}%</td>
              {onRemove && (
                <td className="px-2 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onRemove(p.symbol)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${displaySymbol(p.symbol)}`}
                  >
                    <X className="size-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
