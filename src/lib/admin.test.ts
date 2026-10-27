import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { seedDemo } from "@/db/seed-demo";
import { AdminError, dashboardCounts, intakeStock, saveBuybackCheck, setBuybackStatus, setOrderStatus, stockFromBuyback, suggestPrice } from "./admin";
import { nextOrderStatuses } from "./admin-status";
import { createBuyback } from "./buyback";
import { createOrder } from "./orders";

let db: Db;
beforeEach(async () => {
  const d = drizzle(new PGlite(), { schema: s });
  await migrate(d, { migrationsFolder: "./drizzle" });
  db = d as unknown as Db;
  await seedDemo(db, "2026-10-27");
});

const qtyOf = async (id: string) => (await db.select().from(s.stockItems).where(eq(s.stockItems.id, id)))[0].quantity;

describe("stavy objednávky", () => {
  it("dobírka se balí bez platby, převod musí být zaplacený", () => {
    expect(nextOrderStatuses("new", "cod")).toEqual(["packed", "cancelled"]);
    expect(nextOrderStatuses("new", "bank_transfer")).toEqual(["paid", "cancelled"]);
    expect(nextOrderStatuses("cancelled", "cod")).toEqual([]);
  });
});

describe("administrace proti skutečnému Postgresu", () => {
  it("zrušení objednávky vrátí kusy do skladu, nepovolený krok odmítne", async () => {
    const item = (await db.select().from(s.stockItems)).find((x) => x.quantity >= 2)!;
    const order = await createOrder(
      db,
      [{ stockItemId: item.id, qty: 2, unitHal: item.priceHal, title: "x", condition: item.condition, language: item.language }],
      { email: "a@b.cz", phone: "+420 777 123 456", name: "A", shipping: "pickup", payment: "bank_transfer", company: false, terms: true },
    );
    expect(await qtyOf(item.id)).toBe(item.quantity - 2);
    await expect(setOrderStatus(db, order.id, "shipped")).rejects.toBeInstanceOf(AdminError);
    await setOrderStatus(db, order.id, "paid");
    expect((await dashboardCounts(db)).orders.paid).toBe(1);
    await setOrderStatus(db, order.id, "cancelled");
    expect(await qtyOf(item.id)).toBe(item.quantity);
  });

  it("výkup: kontrola → schválení → výplata kreditem → naskladnění (jen jednou)", async () => {
    const req = await createBuyback(db, {
      email: "petra@email.cz",
      payout: "credit",
      items: [{ cardId: "swsh9tg-TG16", condition: "NM", language: "EN", quantity: 2 }],
    });
    await setBuybackStatus(db, req.id, "received");
    const [item] = await db.select().from(s.buybackItems).where(eq(s.buybackItems.requestId, req.id));
    await saveBuybackCheck(db, req.id, [{ itemId: item.id, condition: "EX", finalHal: 500_00 }]);
    await setBuybackStatus(db, req.id, "approved");
    await setBuybackStatus(db, req.id, "paid");
    const credit = await db.select().from(s.storeCredit);
    expect(credit).toHaveLength(1);
    expect(credit[0].amountHal).toBe(500_00);
    await expect(setBuybackStatus(db, req.id, "paid")).rejects.toBeInstanceOf(AdminError);

    expect(await stockFromBuyback(db, req.id)).toBe(1);
    expect(await stockFromBuyback(db, req.id)).toBe(0);
    const [stocked] = await db.select().from(s.stockItems).where(eq(s.stockItems.buybackItemId, item.id));
    expect(stocked).toMatchObject({ condition: "EX", quantity: 2, purchaseHal: 250_00, source: "buyback" });
    expect(stocked.priceHal).toBe(await suggestPrice(db, "swsh9tg-TG16", "holo", "EX", "EN"));
  });

  it("naskladnění navrhne cenu z trhu a stejný kus jen navýší", async () => {
    const a = await intakeStock(db, { cardId: "sv01-245", condition: "LP", language: "EN", finish: "holo", quantity: 1, priceLocked: false });
    // 53 € × 24,30 × 0,7 (LP) × 1,1 = 991,8 Kč → 990 Kč
    expect(a).toMatchObject({ merged: false, priceHal: 990_00 });
    const b = await intakeStock(db, { cardId: "sv01-245", condition: "LP", language: "EN", finish: "holo", quantity: 2, priceLocked: false });
    expect(b).toMatchObject({ merged: true, id: a.id });
    expect(await qtyOf(a.id)).toBe(3);
    await expect(intakeStock(db, { cardId: "neni", condition: "NM", language: "EN", finish: "holo", quantity: 1, priceLocked: false })).rejects.toBeInstanceOf(AdminError);
  });
});
