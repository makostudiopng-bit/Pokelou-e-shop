import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { seedDemo } from "@/db/seed-demo";
import { setOrderStatus } from "./admin";
import { checkCode, createCode, DiscountError, discountAmount, findCode, normalizeCode } from "./discounts";
import { createOrder } from "./orders";

let db: Db;
beforeEach(async () => {
  const d = drizzle(new PGlite(), { schema: s });
  await migrate(d, { migrationsFolder: "./drizzle" });
  db = d as unknown as Db;
  await seedDemo(db, "2026-10-27");
});

const input = { email: "a@b.cz", phone: "+420 777 123 456", name: "A", shipping: "pickup" as const, payment: "bank_transfer" as const, company: false, terms: true as const };
const base = { minOrderHal: null, validFrom: null, validUntil: null, maxUses: null, note: null };

async function line(qty = 1) {
  const item = (await db.select().from(s.stockItems)).find((x) => x.quantity >= qty && x.priceHal >= 500_00)!;
  return { stockItemId: item.id, qty, unitHal: item.priceHal, title: "x", condition: item.condition, language: item.language };
}

describe("výpočet slevy", () => {
  it("procenta, pevná částka a strop na cenu karet", () => {
    expect(discountAmount({ kind: "percent", value: 10 }, 1234_00)).toBe(123_40);
    expect(discountAmount({ kind: "fixed", value: 200_00 }, 150_00)).toBe(150_00);
    expect(normalizeCode(" jaro 10 ")).toBe("JARO10");
  });
  it("podmínky platnosti", () => {
    const c = { id: "x", code: "X", kind: "percent" as const, value: 10, usedCount: 0, active: true, createdAt: new Date(), ...base };
    const now = new Date("2026-11-01T12:00:00Z");
    expect(checkCode({ ...c, minOrderHal: 1000_00 }, 999_00, now)).toMatchObject({ ok: false });
    expect(checkCode({ ...c, validUntil: new Date("2026-11-01T00:00:00Z") }, 999_00, now)).toMatchObject({ ok: false });
    expect(checkCode({ ...c, maxUses: 2, usedCount: 2 }, 999_00, now)).toMatchObject({ ok: false });
    expect(checkCode({ ...c, active: false }, 999_00, now)).toMatchObject({ ok: false });
    expect(checkCode(c, 1000_00, now)).toMatchObject({ ok: true, discountHal: 100_00 });
  });
});

describe("slevové kódy proti skutečnému Postgresu", () => {
  it("objednávka uloží slevu i poznámku, zrušení vrátí použití", async () => {
    await createCode(db, { ...base, code: "JARO10", kind: "percent", value: 10, maxUses: 1 });
    const code = (await findCode(db, "jaro10"))!;
    const l = await line();
    const order = await createOrder(db, [l], { ...input, note: "Prosím do jedné obálky" }, code.id);
    expect(order).toMatchObject({ discountCode: "JARO10", discountHal: Math.round(l.unitHal / 10), note: "Prosím do jedné obálky" });
    expect(order.totalHal).toBe(l.unitHal - order.discountHal);
    expect((await findCode(db, "JARO10"))!.usedCount).toBe(1);

    // vyčerpaný kód: objednávka neprojde a sklad se vrátí
    const l2 = await line();
    const before = (await db.select().from(s.stockItems).where(eq(s.stockItems.id, l2.stockItemId)))[0].quantity;
    await expect(createOrder(db, [l2], input, code.id)).rejects.toBeInstanceOf(DiscountError);
    expect((await db.select().from(s.stockItems).where(eq(s.stockItems.id, l2.stockItemId)))[0].quantity).toBe(before);

    await setOrderStatus(db, order.id, "cancelled");
    expect((await findCode(db, "JARO10"))!.usedCount).toBe(0);
  });

  it("duplicitní a nesmyslné kódy odmítne", async () => {
    await createCode(db, { ...base, code: "VIP", kind: "fixed", value: 100_00 });
    await expect(createCode(db, { ...base, code: "VIP", kind: "fixed", value: 100_00 })).rejects.toThrow("už existuje");
    await expect(createCode(db, { ...base, code: "X", kind: "percent", value: 10 })).rejects.toBeInstanceOf(DiscountError);
    await expect(createCode(db, { ...base, code: "MOC", kind: "percent", value: 120 })).rejects.toBeInstanceOf(DiscountError);
  });
});
