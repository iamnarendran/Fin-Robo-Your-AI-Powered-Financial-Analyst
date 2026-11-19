import { analyzePortfolio, holdingsSchema } from "@/lib/portfolio-data";

/** POST so holdings travel in the body, not in URLs or server logs. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = holdingsSchema.safeParse(body?.holdings);
  if (!parsed.success) return Response.json({ error: "Invalid holdings" }, { status: 400 });
  try {
    return Response.json(await analyzePortfolio(parsed.data));
  } catch {
    return Response.json({ error: "Market data unavailable" }, { status: 502 });
  }
}
