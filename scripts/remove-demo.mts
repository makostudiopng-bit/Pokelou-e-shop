// Odstraní ukázkový sklad (kusy s poznámkou "demo"). Kusy, které už jsou v objednávce,
// se nesmažou, jen se vynulují, aby objednávky zůstaly v pořádku.
//   npx tsx scripts/remove-demo.mts
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { getDb } from "../src/db/index";
import { DEMO_NOTE } from "../src/db/seed-demo";
import * as s from "../src/db/schema";

const db = await getDb();
const demo = await db.select({ id: s.stockItems.id }).from(s.stockItems).where(eq(s.stockItems.note, DEMO_NOTE));
const ids = demo.map((d) => d.id);
if (ids.length === 0) {
  console.log("Žádné ukázkové kusy.");
  process.exit(0);
}
const ordered = (await db.selectDistinct({ id: s.orderItems.stockItemId }).from(s.orderItems).where(inArray(s.orderItems.stockItemId, ids))).map((r) => r.id);
if (ordered.length) {
  await db.update(s.stockItems).set({ quantity: 0, reserved: 0 }).where(inArray(s.stockItems.id, ordered));
}
const removable = ordered.length ? and(eq(s.stockItems.note, DEMO_NOTE), notInArray(s.stockItems.id, ordered)) : eq(s.stockItems.note, DEMO_NOTE);
await db.delete(s.stockItems).where(removable);
console.log(`Smazáno ${ids.length - ordered.length} ukázkových kusů, vynulováno ${ordered.length} (jsou v objednávkách).`);
process.exit(0);
