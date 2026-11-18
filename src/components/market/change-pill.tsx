import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";

export function ChangePill({ value, className }: { value: number | null; className?: string }) {
  if (value == null) return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular",
        up ? "bg-up-soft text-up" : "bg-down-soft text-down",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {formatPercent(Math.abs(value)).replace("+", "")}
      <span className="sr-only">{up ? "up" : "down"}</span>
    </span>
  );
}
