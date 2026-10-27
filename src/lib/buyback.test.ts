import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { seedDemo } from "@/db/seed-demo";
import { createBuyback, getBuyback, searchBuybackCards } from "./buyback";

let db: Db;
beforeAll(async () => {
  const d = drizzle(new PGlite(), { schema: s });
  await migrate(d, { migrationsFolder: "./drizzle" });
  db = d as unknown as Db;
  await seedDemo(db, "2026-10-27");
});

describe("výkup proti skutečnému Postgresu", () => {
  it("najde kartu podle jména i čísla a spočítá trend v Kč", async () => {
    const [m] = await searchBuybackCards(db, "mimikyu tg16");
    expect(m.name).toBe("Mimikyu V");
    expect(m.trendHal).toBe(583_20); // 24 € × kurz 24,30
    expect((await searchBuybackCards(db, "245/198"))[0].name).toBe("Gardevoir ex");
    expect(await searchBuybackCards(db, "%")).toEqual([]);
  });

  it("odhad přepočítá server, levné karty jdou do bulku, kartové pravidlo platí", async () => {
    await db.insert(s.pricingRules).values({ scope: "card", cardId: "swsh9tg-TG16", buybackCashPct: "40" });
    const req = await createBuyback(db, {
      email: "Jan@Email.cz",
      payout: "cash",
      bankAccount: "19-2000145399/0800",
      items: [
        { cardId: "swsh9tg-TG16", condition: "NM", language: "EN", quantity: 1 }, // 583,20 Kč × 40 % = 233 Kč
        { cardId: "sv01-211", condition: "PL", language: "EN", quantity: 3 }, // 194 Kč × 0,5 × 50 % = 48 Kč → bulk
        { cardId: "neexistuje", condition: "NM", language: "EN", quantity: 1 },
      ],
    });
    expect(req.number).toMatch(/^VK-\d{6}-\d{4}$/);
    expect(req.estimateHal).toBe(233_00);
    expect(req.bulkCount).toBe(3);
    const loaded = await getBuyback(db, req.id);
    expect(loaded?.items.map((i) => i.name).sort()).toEqual(["Mimikyu V", "Ralts"]);
    const [row] = await db.select().from(s.buybackRequests).where(eq(s.buybackRequests.id, req.id));
    expect(row.email).toBe("jan@email.cz");
  });
});
