// Hledání karet pro výkupní formulář: GET /api/vykup/hledat?q=mimikyu
import { getDb, hasDb } from "@/db";
import { searchBuybackCards, searchDemoCards } from "@/lib/buyback";

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return Response.json({ cards: [] });
  try {
    const cards = hasDb() ? await searchBuybackCards(await getDb(), q) : searchDemoCards(q);
    return Response.json({ cards }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (e) {
    console.error("Výkup: hledání selhalo", e);
    return Response.json({ cards: [], error: "Hledání teď nefunguje" }, { status: 503 });
  }
}
