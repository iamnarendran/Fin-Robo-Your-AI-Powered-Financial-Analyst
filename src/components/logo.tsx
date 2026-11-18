import { cn } from "@/lib/utils";

/** Rising bars inside a rounded square: a simple, ownable mark. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
        <rect width="24" height="24" rx="6" className="fill-primary" />
        <rect x="6" y="13" width="3" height="5" rx="1" className="fill-primary-foreground opacity-60" />
        <rect x="10.5" y="10" width="3" height="8" rx="1" className="fill-primary-foreground opacity-80" />
        <rect x="15" y="6" width="3" height="12" rx="1" className="fill-brand" />
      </svg>
      <span>Fin-Robo</span>
    </span>
  );
}
