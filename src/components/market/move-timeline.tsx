import { ExternalLink, Newspaper } from "lucide-react";
import type { Article, Move, Tone } from "@/lib/moves";
import { cn, formatPercent } from "@/lib/utils";
import { ChangePill } from "./change-pill";

/** Shared by the stock page and the AI "why it moved" card. Hook-free, so it renders on the server too. */

const fmtDate = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const fmtPublished = (ms: number) =>
  new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST";

const TONE: Record<Tone, { label: string; className: string }> = {
  positive: { label: "Positive", className: "text-up" },
  negative: { label: "Negative", className: "text-down" },
  neutral: { label: "Neutral", className: "text-muted-foreground" },
};

export function ArticleRow({ article }: { article: Article }) {
  const tone = TONE[article.tone];
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded bg-muted px-1 text-[10px] font-medium tabular text-muted-foreground">
        {article.id}
      </span>
      <div className="min-w-0">
        <a href={article.url} target="_blank" rel="noreferrer" className="group text-sm leading-snug hover:underline">
          {article.title}
          <ExternalLink className="ml-1 inline size-3 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden="true" />
        </a>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{article.publisher}</span>
          <span aria-hidden="true">·</span>
          <span>{fmtPublished(article.publishedAt)}</span>
          <span aria-hidden="true">·</span>
          <span className={tone.className}>{tone.label} tone</span>
        </div>
      </div>
    </li>
  );
}

function KindBadge({ move, benchmarkName }: { move: Move; benchmarkName?: string }) {
  if (move.kind === "unknown" || move.benchmarkChangePct == null) return null;
  const label = move.kind === "stock-specific" ? "Stock-specific" : "Market-wide";
  return (
    <span className="text-xs text-muted-foreground">
      <span className="rounded-md border px-1.5 py-0.5 font-medium text-foreground">{label}</span>
      <span className="ml-2">
        {benchmarkName ?? "Benchmark"} {formatPercent(move.benchmarkChangePct, 1)}
      </span>
    </span>
  );
}

export function MoveTimeline({
  moves,
  articles,
  benchmarkName,
  moreHeadlines = 5,
}: {
  moves: Move[];
  articles: Article[];
  benchmarkName?: string;
  moreHeadlines?: number;
}) {
  const byId = new Map(articles.map((a) => [a.id, a]));
  const linked = new Set(moves.flatMap((m) => m.articleIds));
  const others = articles.filter((a) => !linked.has(a.id)).slice(0, moreHeadlines);

  return (
    <div className="space-y-5">
      <ol className="relative space-y-5 border-l pl-5">
        {moves.map((m) => (
          <li key={m.time} className="relative">
            <span
              className={cn(
                "absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-card",
                m.unusual ? (m.changePct >= 0 ? "bg-up" : "bg-down") : "bg-muted-foreground/40",
              )}
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-sm font-medium">{fmtDate(m.time)}</span>
              <ChangePill value={m.changePct} />
              {m.unusual ? (
                <span className="text-xs text-muted-foreground">Unusual move ({Math.abs(m.zScore).toFixed(1)}σ)</span>
              ) : (
                <span className="text-xs text-muted-foreground">Latest session</span>
              )}
              <KindBadge move={m} benchmarkName={benchmarkName} />
            </div>
            {m.articleIds.length > 0 ? (
              <ul className="mt-2.5 space-y-2.5">
                {m.articleIds.map((id) => byId.get(id)).filter(Boolean).map((a) => (
                  <ArticleRow key={a!.id} article={a!} />
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">No matching headline found around this move.</p>
            )}
          </li>
        ))}
      </ol>

      {others.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Newspaper className="size-3.5" aria-hidden="true" /> More recent headlines
          </h4>
          <ul className="space-y-2.5">
            {others.map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
