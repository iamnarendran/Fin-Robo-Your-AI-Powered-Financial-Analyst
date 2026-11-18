import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CardShell({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{title}</h3>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ToolLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-dashed bg-card/50 px-4 py-3 text-sm text-muted-foreground" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ToolError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-down/30 bg-down-soft/40 px-4 py-3 text-sm" role="alert">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-down" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function Metric({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-medium tabular", className)}>{value}</div>
    </div>
  );
}
