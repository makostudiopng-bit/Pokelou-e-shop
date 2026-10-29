// Našeptávač v hlavičce: GET /api/hledat?q=char
import { getOffers } from "@/lib/catalog";
import { suggest } from "@/lib/catalog-query";

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 80);
  try {
    const { offers } = await getOffers();
    return Response.json(suggest(offers, q), { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
  } catch (e) {
    console.error("Našeptávač: hledání selhalo", e);
    return Response.json({ items: [], total: 0 }, { status: 503 });
  }
}
