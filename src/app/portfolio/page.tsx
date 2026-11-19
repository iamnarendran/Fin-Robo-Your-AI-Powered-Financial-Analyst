import type { Metadata } from "next";
import { PortfolioPage } from "@/components/portfolio/portfolio-page";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Track holdings, P&L and allocation privately in your browser. Import from Zerodha.",
};

export default function Page() {
  return <PortfolioPage />;
}
