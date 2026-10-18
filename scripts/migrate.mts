// Spouští se před každým buildem (npm run build). Bez DATABASE_URL se přeskočí,
// takže build funguje i lokálně a v náhledech bez databáze.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("migrate: DATABASE_URL není nastavená, přeskakuji");
} else {
  await migrate(drizzle(neon(url)), { migrationsFolder: "./drizzle" });
  console.log("migrate: databáze je aktuální");
}
