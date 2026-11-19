import type { NextRequest } from "next/server";
import { getQuotes } from "@/lib/market-data";

const SYMBOL = /^[\w.^=&-]{1,24}$/;

export async function GET(request: NextRequest) {
  const symbols = (request.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => SYMBOL.test(s))
    .slice(0, 50);
  if (symbols.length === 0) return Response.json([]);
  try {
    return Response.json(await getQuotes(symbols));
  } catch {
    return Response.json({ error: "Market data unavailable" }, { status: 502 });
  }
}
