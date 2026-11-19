import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BriefArticle } from "@/components/brief/brief-view";
import { getDailyBrief } from "@/lib/brief";
import { safe } from "@/lib/market-data";

export const metadata: Metadata = {
  title: "Daily market brief",
  description: "Today's Indian market in two minutes: NIFTY, SENSEX, sectors, movers and global cues, summarised by AI from live data.",
};

export default function BriefPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
          <div className="skeleton h-4 w-64" />
          <div className="skeleton h-9 w-full" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      }
    >
      <Brief />
    </Suspense>
  );
}

async function Brief() {
  // Request time, never build time: a brief must reflect the current market.
  await connection();
  const brief = await safe(getDailyBrief(), null);
  if (!brief) return <p className="mx-auto max-w-3xl text-muted-foreground">The brief is unavailable right now. Please try again shortly.</p>;
  return <BriefArticle brief={brief} />;
}
