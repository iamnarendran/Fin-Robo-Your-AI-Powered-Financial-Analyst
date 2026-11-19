import { ArrowRight, Eye, Newspaper, Sparkles } from "lucide-react";
import Link from "next/link";
import { ArticleRow } from "@/components/market/move-timeline";
import { ChangePill } from "@/components/market/change-pill";
import type { DailyBrief } from "@/lib/brief";
import { displaySymbol } from "@/lib/markets";
import { formatNumber } from "@/lib/utils";

const updated = (ms: number) =>
  new Date(ms).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST";

function Byline({ brief }: { brief: DailyBrief }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1 font-medium text-foreground">
        <Sparkles className="size-3.5 text-brand" aria-hidden="true" /> Daily brief
      </span>
      <span aria-hidden="true">·</span>
      <span>Updated {updated(brief.generatedAt)}</span>
      <span aria-hidden="true">·</span>
      <span>{brief.source === "ai" ? "Written by AI from live data" : "Auto-summary from live data"}</span>
    </p>
  );
}

/** Compact version for the home page. */
export function BriefCard({ brief }: { brief: DailyBrief }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <Byline brief={brief} />
      <h2 className="mt-3 text-lg font-semibold leading-snug tracking-tight sm:text-xl">{brief.text.headline}</h2>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{brief.text.summary}</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {brief.text.keyPoints.slice(0, 3).map((k) => (
          <li key={k.title} className="rounded-lg bg-muted/60 p-3">
            <div className="text-xs font-medium">{k.title}</div>
            <div className="mt-0.5 text-sm text-muted-foreground">{k.detail}</div>
          </li>
        ))}
      </ul>
      <Link href="/brief" className="mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline">
        Read the full brief <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}

export function BriefCardSkeleton() {
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5" aria-busy="true">
      <div className="skeleton h-3.5 w-56" />
      <div className="skeleton h-6 w-3/4" />
      <div className="skeleton h-12 w-full" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-16" />
        ))}
      </div>
    </section>
  );
}

/** Full article for /brief. */
export function BriefArticle({ brief }: { brief: DailyBrief }) {
  const { text, data, headlines } = brief;
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3">
        <Byline brief={brief} />
        <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{text.headline}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{text.summary}</p>
      </header>

      <section aria-label="Indices" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.indices.map((q) => (
          <Link key={q.symbol} href={`/stock/${encodeURIComponent(q.symbol)}`} className="rounded-lg border bg-card p-3 transition-colors hover:border-ring">
            <div className="text-xs text-muted-foreground">{q.name}</div>
            <div className="mt-0.5 font-medium tabular">{formatNumber(q.price, 2, q.currency)}</div>
            <ChangePill value={q.changePercent} className="mt-1" />
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Key points</h2>
        <ol className="space-y-3">
          {text.keyPoints.map((k, i) => (
            <li key={k.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular">{i + 1}</span>
              <div>
                <div className="font-medium">{k.title}</div>
                <p className="text-muted-foreground">{k.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "Top gainers", list: data.gainers },
          { title: "Top losers", list: data.losers },
        ].map(({ title, list }) => (
          <div key={title} className="rounded-xl border bg-card">
            <h3 className="border-b px-4 py-2.5 text-sm font-medium">{title} · NIFTY 50</h3>
            <ul className="divide-y">
              {list.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">None today.</li>}
              {list.map((q) => (
                <li key={q.symbol}>
                  <Link href={`/stock/${encodeURIComponent(q.symbol)}`} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/60">
                    <span className="font-medium">{displaySymbol(q.symbol)}</span>
                    <ChangePill value={q.changePercent} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-medium">Global cues</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {data.global.map((q) => (
            <span key={q.symbol} className="inline-flex items-center gap-1.5">
              <span className="text-muted-foreground">{q.name}</span>
              <ChangePill value={q.changePercent} />
            </span>
          ))}
        </div>
      </section>

      {text.watch.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-base font-semibold tracking-tight">
            <Eye className="size-4" aria-hidden="true" /> What to watch
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            {text.watch.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {headlines.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-base font-semibold tracking-tight">
            <Newspaper className="size-4" aria-hidden="true" /> Market headlines
          </h2>
          <ul className="space-y-3">
            {headlines.map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </ul>
        </section>
      )}

      <footer className="space-y-3 border-t pt-6">
        <Link href="/ask?q=How%20is%20the%20Indian%20market%20doing%20today%3F" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          <Sparkles className="size-4" aria-hidden="true" /> Ask a follow-up
        </Link>
        <p className="text-xs text-muted-foreground">
          {brief.source === "ai" ? `Written by ${brief.model ?? "AI"} from Yahoo Finance data and public headlines. AI can make mistakes. ` : ""}
          Educational content, not investment advice.
        </p>
      </footer>
    </article>
  );
}
