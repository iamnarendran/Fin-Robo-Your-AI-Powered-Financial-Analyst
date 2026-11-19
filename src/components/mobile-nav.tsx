"use client";

import { BarChart3, Briefcase, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Markets", icon: BarChart3 },
  { href: "/ask", label: "Ask AI", icon: Sparkles },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
];

/** App-style bottom tabs on phones; the header nav takes over from md up. */
export function MobileNav() {
  return <MobileNavBar pathname={usePathname()} />;
}

/** Rendered without an active tab as the Suspense fallback while the path is unknown. */
export function MobileNavBar({ pathname }: { pathname?: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Main">
      <ul className="grid grid-cols-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname != null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-1 py-2 text-[11px]", active ? "text-foreground" : "text-muted-foreground")}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
