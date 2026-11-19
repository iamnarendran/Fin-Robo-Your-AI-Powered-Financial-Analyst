import type { Metadata } from "next";
import { WatchlistPage } from "@/components/portfolio/watchlist-page";

export const metadata: Metadata = { title: "Watchlist" };

export default function Page() {
  return <WatchlistPage />;
}
