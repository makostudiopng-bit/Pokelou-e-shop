// Připojení k databázi. Na Vercelu Neon (HTTP), lokálně a v testech volitelně PGlite:
//   DATABASE_URL="pglite:./.data/pglite"  → Postgres v souboru, nic se neinstaluje
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<PgQueryResultHKT, typeof schema, any>;

const g = globalThis as unknown as { __plDb?: Promise<Db> };

async function create(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL není nastavená");
  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const path = url.slice("pglite:".length) || undefined;
    if (path) (await import("node:fs")).mkdirSync(path, { recursive: true });
    return drizzle(new PGlite(path), { schema }) as unknown as Db;
  }
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  return drizzle(neon(url), { schema }) as unknown as Db;
}

/** Připojení se vytvoří až při prvním použití (build ho nepotřebuje). */
export function getDb(): Promise<Db> {
  g.__plDb ??= create();
  return g.__plDb;
}

export const hasDb = () => Boolean(process.env.DATABASE_URL);

export { schema };

/** Řádky z db.execute() – Neon i PGlite vracejí { rows }. */
export function rowsOf<T = Record<string, unknown>>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}
