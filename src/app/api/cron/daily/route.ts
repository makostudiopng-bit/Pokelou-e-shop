// Denní úloha (Vercel Cron): kurz ČNB → ceny z TCGdex → přecenění skladu.
import { getDb } from "@/db";
import { cardsToPrice, repriceStock, syncPrices, syncRate } from "@/lib/sync";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const d = await getDb();
  const rate = await syncRate(d);
  const ids = await cardsToPrice(d);
  const prices = await syncPrices(d, ids, { day: rate.day });
  const reprice = await repriceStock(d);

  return Response.json({ rate, prices, reprice });
}
