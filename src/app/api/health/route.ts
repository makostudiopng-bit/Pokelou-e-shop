// Kontrola nasazení: co je nastavené a jestli databáze odpovídá. Nevrací žádné hodnoty proměnných.
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    database: Boolean(process.env.DATABASE_URL),
    cronSecret: Boolean(process.env.CRON_SECRET),
  };
  if (!env.database) return Response.json({ ok: false, env, db: "chybí DATABASE_URL" });

  try {
    const db = getDb();
    const r = await db.execute(sql`
      select
        (select count(*) from sets)::int as sets,
        (select count(*) from cards)::int as cards,
        (select count(*) from stock_items)::int as stock,
        (select max(day)::text from exchange_rates) as rate_day,
        (select max(day)::text from price_snapshots) as price_day`);
    const counts = r.rows[0];
    return Response.json({ ok: env.cronSecret, env, db: "ok", counts });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const missingTables = /relation .* does not exist/.test(message);
    return Response.json(
      { ok: false, env, db: missingTables ? "chybí tabulky (migrace neproběhla)" : "nelze se připojit" },
      { status: 503 },
    );
  }
}
