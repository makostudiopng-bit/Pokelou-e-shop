import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { seedDemo } from "@/db/seed-demo";
import type { CheckoutInput } from "./checkout";
import { createOrder, getOrder, StockConflictError, type OrderLine } from "./orders";

const input: CheckoutInput = {
  email: "Jan@Email.cz",
  phone: "+420 777 123 456",
  name: "Jan Novák",
  shipping: "zasilkovna",
  payment: "cod",
  point: "Z-BOX Praha 3",
  company: false,
  terms: true,
};

let db: Db;
let stock: (typeof s.stockItems.$inferSelect)[];
beforeEach(async () => {
  const d = drizzle(new PGlite(), { schema: s });
  await migrate(d, { migrationsFolder: "./drizzle" });
  db = d as unknown as Db;
  await seedDemo(db, "2026-10-27");
  stock = await db.select().from(s.stockItems);
});

const line = (item: (typeof stock)[number], qty: number): OrderLine => ({
  stockItemId: item.id,
  qty,
  unitHal: item.priceHal,
  title: "Karta",
  condition: item.condition,
  language: item.language,
});
const qtyOf = async (id: string) => (await db.select().from(s.stockItems).where(eq(s.stockItems.id, id)))[0].quantity;

describe("objednávka proti skutečnému Postgresu", () => {
  it("odečte sklad, spočítá součty a uloží položky", async () => {
    const a = stock.find((x) => x.quantity >= 2)!;
    const b = stock.find((x) => x.quantity >= 1 && x.id !== a.id)!;
    const order = await createOrder(db, [line(a, 2), line(b, 1)], input);
    expect(order.number).toMatch(/^PL-\d{6}-\d{4}$/);
    expect(order.email).toBe("jan@email.cz");
    expect(order.totalHal).toBe(2 * a.priceHal + b.priceHal + 79_00 + 39_00);
    expect(await qtyOf(a.id)).toBe(a.quantity - 2);
    const loaded = await getOrder(db, order.id);
    expect(loaded?.items).toHaveLength(2);
  });

  it("když jeden kus chybí, neodečte nic a ohlásí který", async () => {
    const a = stock.find((x) => x.quantity >= 1)!;
    const out = stock.find((x) => x.quantity === 0)!;
    await expect(createOrder(db, [line(a, 1), line(out, 1)], input)).rejects.toBeInstanceOf(StockConflictError);
    expect(await qtyOf(a.id)).toBe(a.quantity);
  });

  it("dvě objednávky o poslední kus: projde jen jedna", async () => {
    const last = stock.find((x) => x.quantity === 1)!;
    const results = await Promise.allSettled([createOrder(db, [line(last, 1)], input), createOrder(db, [line(last, 1)], input)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await qtyOf(last.id)).toBe(0);
  });
});
