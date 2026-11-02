// Prodejní režim pro burzu (telefon prodejce).
// GET  → aktuální sklad (pro hledání i bez internetu)
// POST → dávka prodejů z telefonu; každý se uloží jen jednou (ID z telefonu)
import { z } from "zod";
import { getDb, hasDb } from "@/db";
import { isAdmin } from "@/lib/admin-session";
import { getOffers } from "@/lib/catalog";
import { fairSaleInput, FairError, recordSale, type SaleResult } from "@/lib/fair";

export const dynamic = "force-dynamic";

const deny = () => Response.json({ error: "Přihlášení vypršelo" }, { status: 401 });

export async function GET() {
  if (!(await isAdmin())) return deny();
  const { offers, demo } = await getOffers();
  if (!hasDb() || demo) return Response.json({ error: "Burza potřebuje napojený sklad" }, { status: 503 });
  const items = offers
    .filter((o) => o.stock > 0)
    .map((o) => ({
      id: o.id,
      name: o.name,
      set: o.set,
      setCode: o.setCode,
      number: o.number,
      condition: o.condition,
      lang: o.lang,
      finish: o.finish,
      priceHal: o.priceHal,
      stock: o.stock,
      image: o.image,
    }));
  return Response.json({ items, at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}

const body = z.object({ sales: z.array(z.unknown()).min(1).max(100) });

export async function POST(request: Request) {
  if (!(await isAdmin())) return deny();
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Neplatná data" }, { status: 400 });
  const db = await getDb();
  const results: (SaleResult | { id: string; status: "error"; error: string })[] = [];
  // po jednom, ať jeden vadný prodej nezablokuje ostatní ve frontě
  for (const raw of parsed.data.sales) {
    const sale = fairSaleInput.safeParse(raw);
    const id = (raw as { id?: unknown })?.id;
    if (!sale.success) {
      results.push({ id: typeof id === "string" ? id : "", status: "error", error: "Neplatný prodej" });
      continue;
    }
    try {
      results.push(await recordSale(db, sale.data));
    } catch (e) {
      if (!(e instanceof FairError)) console.error("Burza: prodej se nepodařilo uložit", e);
      // chyba databáze: telefon to zkusí znovu, neplatný kus: ukáže se prodejci
      if (!(e instanceof FairError)) return Response.json({ results, error: "Uložení selhalo, zkusím znovu" }, { status: 503 });
      results.push({ id: sale.data.id, status: "error", error: e.message });
    }
  }
  return Response.json({ results });
}
