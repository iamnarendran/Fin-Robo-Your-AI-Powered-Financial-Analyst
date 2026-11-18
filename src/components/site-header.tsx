import { Sparkles } from "lucide-react";
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
          <Link href="/ask" className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
            Ask AI
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/ask"
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Ask AI"
          >
            <Sparkles className="size-4" />
          </Link>
          <MarketStatus className="hidden lg:flex" />
          <CommandMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
