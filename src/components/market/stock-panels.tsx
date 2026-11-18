import { ExternalLink } from "lucide-react";
import type { PerformanceSummary } from "@/lib/indicators";
import type { Profile, Quote } from "@/lib/types";
import { cn, formatCompact, formatNumber, formatPercent, formatPrice, formatVolume, trendClass } from "@/lib/utils";

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <h2 className="border-b px-4 py-3 text-sm font-medium">{title}</h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Row({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right font-medium tabular", className)}>{value}</dd>
    </div>
  );
}

/** Where today's price sits inside its 52-week range. */
function RangeBar({ low, high, value, currency }: { low: number; high: number; value: number; currency: string }) {
  const pct = high > low ? Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100)) : 50;
  return (
    <div className="space-y-1.5 pt-1">
      <div className="relative h-1.5 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary/25" style={{ width: `${pct}%` }} />
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground tabular">
        <span>{formatPrice(low, currency)}</span>
        <span>{formatPrice(high, currency)}</span>
      </div>
    </div>
  );
}

export function KeyStats({ quote }: { quote: Quote }) {
  const c = quote.currency;
  const isEquity = quote.quoteType === "EQUITY";
  return (
    <Panel title="Key stats">
      <dl>
        <Row label="Open" value={formatPrice(quote.open, c)} />
        <Row label="Previous close" value={formatPrice(quote.previousClose, c)} />
        <Row label="Day range" value={`${formatNumber(quote.dayLow, 2, c)} – ${formatNumber(quote.dayHigh, 2, c)}`} />
        {quote.volume ? <Row label="Volume" value={formatVolume(quote.volume)} /> : null}
        {quote.avgVolume ? <Row label="Avg volume (3M)" value={formatVolume(quote.avgVolume)} /> : null}
        {isEquity && <Row label="Market cap" value={formatCompact(quote.marketCap, c)} />}
        {isEquity && <Row label="P/E (TTM)" value={formatNumber(quote.pe)} />}
        {isEquity && <Row label="EPS (TTM)" value={formatPrice(quote.eps, c)} />}
        {isEquity && <Row label="Dividend yield" value={quote.dividendYield ? formatPercent(quote.dividendYield, 2, false) : "—"} />}
      </dl>
      {quote.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null && quote.price != null && (
        <div className="mt-3 border-t pt-3">
          <div className="text-sm text-muted-foreground">52-week range</div>
          <RangeBar low={quote.fiftyTwoWeekLow} high={quote.fiftyTwoWeekHigh} value={quote.price} currency={c} />
        </div>
      )}
    </Panel>
  );
}

const TREND_COPY: Record<NonNullable<PerformanceSummary["trend"]>, string> = {
  "above-both": "Trading above its 50 and 200-day averages",
  "below-both": "Trading below its 50 and 200-day averages",
  mixed: "Between its 50 and 200-day averages",
};

function rsiLabel(value: number) {
  if (value >= 70) return "Overbought";
  if (value <= 30) return "Oversold";
  return "Neutral";
}

export function PerformanceCard({ performance, currency }: { performance: PerformanceSummary; currency: string }) {
  const { returns, volatility, maxDrawdown, rsi14, sma50, sma200, trend } = performance;
  return (
    <Panel title="Performance">
      <div className="grid grid-cols-5 gap-1.5">
        {returns.map((r) => (
          <div key={r.label} className="rounded-lg bg-muted/60 px-1 py-2 text-center">
            <div className="text-[11px] text-muted-foreground">{r.label}</div>
            <div className={cn("text-xs font-medium tabular", trendClass(r.value))}>{formatPercent(r.value, 1)}</div>
          </div>
        ))}
      </div>
      <dl className="mt-3">
        <Row label="Volatility (1Y, ann.)" value={formatPercent(volatility, 1, false)} />
        <Row label="Max drawdown (1Y)" value={formatPercent(maxDrawdown, 1)} className="text-down" />
        <Row
          label="RSI (14)"
          value={rsi14 == null ? "—" : `${rsi14.toFixed(0)} · ${rsiLabel(rsi14)}`}
        />
        <Row label="50-day average" value={formatPrice(sma50, currency)} />
        <Row label="200-day average" value={formatPrice(sma200, currency)} />
      </dl>
      {trend && <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">{TREND_COPY[trend]}.</p>}
    </Panel>
  );
}

export function CompanyProfile({ profile }: { profile: Profile | null }) {
  if (!profile) {
    return (
      <Panel title="About">
        <p className="text-sm text-muted-foreground">No company profile is available for this instrument.</p>
      </Panel>
    );
  }
  return (
    <Panel title="About">
      <div className="flex flex-wrap gap-1.5">
        {[profile.sector, profile.industry].filter(Boolean).map((tag) => (
          <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs">
            {tag}
          </span>
        ))}
      </div>
      {profile.summary && <p className="mt-3 line-clamp-[8] text-sm leading-relaxed text-muted-foreground">{profile.summary}</p>}
      <dl className="mt-3 border-t pt-2">
        {profile.location && <Row label="Headquarters" value={profile.location} />}
        {profile.employees && <Row label="Employees" value={formatNumber(profile.employees, 0)} />}
      </dl>
      {profile.website && (
        <a
          href={profile.website}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          {profile.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </Panel>
  );
}
