import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { seedDemo } from "@/db/seed-demo";
import { cancelSale, closeConflict, listSales, recordSale, retryConflict, summarize } from "./fair";
import { createOrder } from "./orders";

let db: Db;
beforeEach(async () => {
  const d = drizzle(new PGlite(), { schema: s });
  await migrate(d, { migrationsFolder: "./drizzle" });
  db = d as unknown as Db;
  await seedDemo(db, "2026-10-27");
});

const qty = async (id: string) => (await db.select().from(s.stockItems).where(eq(s.stockItems.id, id)))[0].quantity;
const one = async () => (await db.select().from(s.stockItems)).find((x) => x.quantity === 1)!;
const sale = (over: Partial<Parameters<typeof recordSale>[1]> = {}) => ({
  id: crypto.randomUUID(),
  receiptId: crypto.randomUUID(),
  eventName: "Burza Praha",
  stockItemId: null as string | null,
  title: "karta",
  quantity: 1,
  unitHal: 500_00,
  payment: "cash" as const,
  soldAt: new Date(),
  ...over,
});
const input = { email: "a@b.cz", phone: "+420 777 123 456", name: "A", shipping: "pickup" as const, payment: "bank_transfer" as const, company: false, terms: true as const };

describe("prodej na burze proti skutečnému Postgresu", () => {
  it("odečte sklad, opakované odeslání nic nezdvojí, storno vrátí kus", async () => {
    const item = await one();
    const x = sale({ stockItemId: item.id, unitHal: item.priceHal - 100_00 });
    expect((await recordSale(db, x)).status).toBe("ok");
    expect(await qty(item.id)).toBe(0);
    // výpadek sítě: telefon pošle stejný prodej znovu
    expect((await recordSale(db, x)).status).toBe("ok");
    expect(await listSales(db)).toHaveLength(1);
    expect(await qty(item.id)).toBe(0);

    await cancelSale(db, x.id);
    expect(await qty(item.id)).toBe(1);
    await expect(cancelSale(db, x.id)).rejects.toThrow();
    expect(await qty(item.id)).toBe(1);
  });

  it("kus prodaný mezitím na e-shopu: konflikt, sklad nejde do minusu", async () => {
    const item = await one();
    await createOrder(db, [{ stockItemId: item.id, qty: 1, unitHal: item.priceHal, title: "x", condition: item.condition, language: item.language }], input);
    const x = sale({ stockItemId: item.id });
    expect((await recordSale(db, x)).status).toBe("conflict");
    expect(await qty(item.id)).toBe(0);
    await expect(retryConflict(db, x.id)).rejects.toThrow("pořád není skladem");
    await closeConflict(db, x.id);
    const [row] = await listSales(db);
    expect(row.resolvedAt).not.toBeNull();
    expect(summarize([row])[0].conflicts).toBe(0);
  });

  it("konflikt se dá dořešit, když se kus vrátí do skladu", async () => {
    const item = await one();
    await db.update(s.stockItems).set({ quantity: 0 }).where(eq(s.stockItems.id, item.id));
    const x = sale({ stockItemId: item.id });
    expect((await recordSale(db, x)).status).toBe("conflict");
    await db.update(s.stockItems).set({ quantity: 1 }).where(eq(s.stockItems.id, item.id));
    await retryConflict(db, x.id);
    expect(await qty(item.id)).toBe(0);
    expect((await listSales(db))[0].status).toBe("ok");
  });

  it("ruční položky a souhrn podle platby a slev", async () => {
    const item = await one();
    await recordSale(db, sale({ stockItemId: item.id, unitHal: item.priceHal - 50_00, payment: "card" }));
    await recordSale(db, sale({ title: "Bulk 50 ks", quantity: 2, unitHal: 100_00 }));
    const c = sale({ title: "Toploader", unitHal: 10_00 });
    await recordSale(db, c);
    await cancelSale(db, c.id);
    const [sum] = summarize(await listSales(db));
    expect(sum).toMatchObject({ event: "Burza Praha", pieces: 3, cardHal: item.priceHal - 50_00, cashHal: 200_00, discountHal: 50_00 });
    expect(sum.totalHal).toBe(item.priceHal - 50_00 + 200_00);
  });
});
