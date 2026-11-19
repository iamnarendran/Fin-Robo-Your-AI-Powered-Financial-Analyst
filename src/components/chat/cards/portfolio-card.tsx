import { ArrowUpRight, Briefcase } from "lucide-react";
import Link from "next/link";
import { AllocationBar, Flags, SummaryStats } from "@/components/portfolio/portfolio-view";
import type { ToolOutput } from "@/lib/ai/types";
import { CardShell } from "./card-shell";

export function PortfolioCard({ data }: { data: ToolOutput<"reviewPortfolio"> }) {
  if (data.empty) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed bg-card p-4 text-sm">
        <Briefcase className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-medium">No holdings yet</p>
          <p className="text-muted-foreground">
            Add stocks or import your Zerodha CSV on the{" "}
            <Link href="/portfolio" className="underline">
              Portfolio page
            </Link>
            . They stay in your browser.
          </p>
        </div>
      </div>
    );
  }
  const s = data.analysis;
  return (
    <CardShell
      title="Your portfolio"
      subtitle="Values in ₹, US holdings converted at the live rate"
      action={
        <Link href="/portfolio" className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
          Open <ArrowUpRight className="size-3.5" />
        </Link>
      }
    >
      <div className="space-y-3 [&_.rounded-xl]:rounded-lg">
        <SummaryStats s={s} />
        <div className="grid gap-3 md:grid-cols-2">
          <AllocationBar title="By stock" slices={s.positions.map((p) => ({ key: p.symbol, label: p.name, weight: p.weight, valueInr: p.valueInr }))} />
          <AllocationBar title="By sector" slices={s.sectors.map((x) => ({ key: x.sector, label: x.sector, weight: x.weight, valueInr: x.valueInr }))} />
        </div>
        <Flags s={s} />
      </div>
    </CardShell>
  );
}
