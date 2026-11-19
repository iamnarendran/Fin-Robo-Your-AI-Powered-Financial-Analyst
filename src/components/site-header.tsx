import Link from "next/link";
import { CommandMenu } from "./command-menu";
import { Logo } from "./logo";
import { MarketStatus } from "./market-status";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-md focus-visible:outline-2 focus-visible:outline-ring">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <Link href="/" className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
            Markets
          </Link>
          <Link href="/brief" className="hidden rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground lg:inline">
            Brief
          </Link>
          <Link href="/ask" className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
            Ask AI
          </Link>
          <Link href="/watchlist" className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
            Watchlist
          </Link>
          <Link href="/portfolio" className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
            Portfolio
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <MarketStatus className="hidden xl:flex" />
          <CommandMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
