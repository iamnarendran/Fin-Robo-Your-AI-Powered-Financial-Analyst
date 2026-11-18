import type { NextRequest } from "next/server";
import { safe, searchSymbols } from "@/lib/market-data";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 64);
  const results = await safe(searchSymbols(q), []);
  return Response.json(results);
}
