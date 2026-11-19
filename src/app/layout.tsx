import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import { MobileNav, MobileNavBar } from "@/components/mobile-nav";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fin-Robo · AI financial analyst for Indian & global markets",
    template: "%s · Fin-Robo",
  },
  description:
    "Track NIFTY, SENSEX and global markets, explore any stock, and ask an AI analyst that answers with live data and news.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#16171b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col pb-16 md:pb-0">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
          <SiteFooter />
          <Suspense fallback={<MobileNavBar />}>
            <MobileNav />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
