// Spouští se před každým buildem (npm run build). Bez DATABASE_URL se přeskočí,
// takže build funguje i lokálně a v náhledech bez databáze.
// Prázdnou databázi naplní ukázkovým skladem; vypnout jde přes SEED_DEMO=0.
import { getDb } from "../src/db/index";
import { seedDemo } from "../src/db/seed-demo";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("migrate: DATABASE_URL není nastavená, přeskakuji");
  process.exit(0);
}

const db = await getDb();
if (url.startsWith("pglite:")) {
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrate(db as any, { migrationsFolder: "./drizzle" });
} else {
  const { migrate } = await import("drizzle-orm/neon-http/migrator");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrate(db as any, { migrationsFolder: "./drizzle" });
}
console.log("migrate: databáze je aktuální");

if (process.env.SEED_DEMO !== "0") {
  const res = await seedDemo(db, new Date().toISOString().slice(0, 10));
  console.log(res.seeded ? `seed: ukázkový sklad (${res.stock} kusů)` : "seed: databáze už obsahuje data, přeskakuji");
}
process.exit(0);
