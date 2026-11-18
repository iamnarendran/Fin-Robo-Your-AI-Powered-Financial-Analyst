import type { NextRequest } from "next/server";
import { getHistory } from "@/lib/market-data";
import { isRange } from "@/lib/types";

const SYMBOL = /^[\w.^=&-]{1,24}$/;

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "";
  const range = request.nextUrl.searchParams.get("range");

  if (!SYMBOL.test(symbol) || !isRange(range)) {
    return Response.json({ error: "Invalid symbol or range" }, { status: 400 });
  }

  try {
    return Response.json(await getHistory(symbol, range));
  } catch {
    return Response.json({ error: "Market data unavailable" }, { status: 502 });
  }
}
