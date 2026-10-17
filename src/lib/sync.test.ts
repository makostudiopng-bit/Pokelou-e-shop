import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import * as s from "@/db/schema";
import { cardSchema, setSchema } from "./tcgdex";
import { cardsToPrice, importSet, repriceStock, syncPrices, syncRate, type Db } from "./sync";

const SET = setSchema.parse({
  id: "sv03.5",
  name: "151",
  serie: { id: "sv", name: "Scarlet & Violet" },
  abbreviation: { official: "MEW" },
  cardCount: { official: 165 },
  cards: [
    { id: "sv03.5-170", localId: "170", name: "Squirtle" },
    { id: "sv03.5-198", localId: "198", name: "Venusaur ex" },
  ],
});
const trends: Record<string, number> = { "sv03.5-170": 30, "sv03.5-198": 100 };
const card = (id: string) =>
  cardSchema.parse({
    id,
    localId: id.split("-")[1],
    name: SET.cards.find((c) => c.id === id)?.name ?? id,
    image: `https://assets.tcgdex.net/en/sv/sv03.5/${id.split("-")[1]}`,
    set: { id: "sv03.5", name: "151" },
    pricing: { cardmarket: { trend: trends[id], avg: trends[id] } },
  });
const getSet = async () => SET;
const getCard = async (id: string) => card(id);

let db: Db;
beforeEach(async () => {
  trends["sv03.5-170"] = 30;
  trends["sv03.5-198"] = 100;
  const d = drizzle(new PGlite(), { schema: s });
  await migrate(d, { migrationsFolder: "./drizzle" });
  db = d as unknown as Db;
});

describe("sync against a real Postgres (PGlite)", () => {
  it("imports a set with cards and prices", async () => {
    const res = await importSet(db, "sv03.5", { day: "2026-10-15", getSet, getCard });
    expect(res).toEqual({ set: "sv03.5", cards: 2, failed: [] });
    const cards = await db.select().from(s.cards);
    expect(cards.map((c) => c.name).sort()).toEqual(["Squirtle", "Venusaur ex"]);
    expect((await db.select().from(s.sets))[0].code).toBe("MEW");
    expect(await db.select().from(s.priceSnapshots)).toHaveLength(2);
  });

  it("prices only stocked cards and reprices stock", async () => {
    await importSet(db, "sv03.5", { day: "2026-10-14", getSet, getCard });
    await syncRate(db, async () => ({ day: "2026-10-15", eurCzk: 25 }));
    const [venu] = await db
      .insert(s.stockItems)
      .values({ cardId: "sv03.5-198", condition: "NM", quantity: 2, priceHal: 3000_00 })
      .returning();
    await db
      .insert(s.stockItems)
      .values({ cardId: "sv03.5-170", condition: "NM", quantity: 1, priceHal: 500_00, priceLocked: true });

    expect((await cardsToPrice(db)).sort()).toEqual(["sv03.5-170", "sv03.5-198"]);

    trends["sv03.5-198"] = 90; // trh klesl
    const sync = await syncPrices(db, ["sv03.5-198"], { day: "2026-10-15", getCard, getSet });
    expect(sync).toEqual({ priced: 1, failed: [] });

    const r = await repriceStock(db);
    expect(r).toEqual({ updated: 1, missingPrice: [] });

    // 90 € × 25 = 2 250 Kč × NM 1 × EN 1 × 1,1 = 2 475 → 2 490
    const [after] = await db.select().from(s.stockItems).where(eq(s.stockItems.id, venu.id));
    expect(after.priceHal).toBe(2490_00);
    expect(after.wasPriceHal).toBe(3000_00);

    const locked = await db.select().from(s.stockItems).where(eq(s.stockItems.cardId, "sv03.5-170"));
    expect(locked[0].priceHal).toBe(500_00);
  });

  it("card rules override the global rule", async () => {
    await importSet(db, "sv03.5", { day: "2026-10-15", getSet, getCard });
    await syncRate(db, async () => ({ day: "2026-10-15", eurCzk: 25 }));
    await db.insert(s.pricingRules).values([
      { scope: "global", markupPct: "20" },
      { scope: "card", cardId: "sv03.5-198", markupPct: "0" },
    ]);
    await db.insert(s.stockItems).values({ cardId: "sv03.5-198", condition: "EX", quantity: 1, priceHal: 1_00 });
    await repriceStock(db);
    // 100 € × 25 = 2 500 × EX 0,85 × 1,0 = 2 125 → 2 090
    const [row] = await db.select().from(s.stockItems);
    expect(row.priceHal).toBe(2090_00);
  });
});
