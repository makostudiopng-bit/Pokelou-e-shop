// Ruční import edice z TCGdex: npx tsx scripts/import-set.mts sv03.5 [sv01 ...]
import { getDb } from "../src/db";
import { importSet } from "../src/lib/sync";

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("Použití: npx tsx scripts/import-set.mts <setId> [setId ...]   např. sv03.5");
  process.exit(1);
}
const day = new Date().toISOString().slice(0, 10);
for (const id of ids) {
  const res = await importSet(await getDb(), id, { day });
  console.log(`${res.set}: ${res.cards} karet${res.failed.length ? `, selhalo: ${res.failed.join(", ")}` : ""}`);
}
