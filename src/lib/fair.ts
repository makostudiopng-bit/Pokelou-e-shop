// Prodej na burzách. Telefon prodejce posílá prodeje (i dávkou po výpadku sítě); každý prodej
// má ID z telefonu, takže opakované odeslání nic nezdvojí. Sklad se odečítá stejným atomickým
// příkazem jako u objednávek z e-shopu, takže kus nejde prodat dvakrát. Když se kus mezitím
// prodal jinde (e-shop), prodej se uloží jako konflikt k ručnímu vyřešení.
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { giveBack, takeStock } from "./orders";

export const fairSaleInput = z.object({
  id: z.string().uuid(),
  receiptId: z.string().uuid(),
  eventName: z.string().trim().min(1).max(80),
  stockItemId: z.string().max(80).nullable(),
  title: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(500),
  unitHal: z.number().int().min(0).max(10_000_000),
  payment: z.enum(s.FAIR_PAYMENTS),
  soldAt: z.coerce.date(),
});
export type FairSaleInput = z.infer<typeof fairSaleInput>;
export type FairSale = typeof s.fairSales.$inferSelect;
export type SaleResult = { id: string; status: FairSale["status"]; title: string };

export class FairError extends Error {}

/** Uloží jeden prodej; opakované volání se stejným ID vrátí původní výsledek. */
export async function recordSale(db: Db, input: FairSaleInput): Promise<SaleResult> {
  const t = s.fairSales;
  const [existing] = await db.select().from(t).where(eq(t.id, input.id));
  if (existing) return { id: existing.id, status: existing.status, title: existing.title };

  let item: typeof s.stockItems.$inferSelect | undefined;
  let title = input.title;
  if (input.stockItemId) {
    [item] = await db.select().from(s.stockItems).where(eq(s.stockItems.id, input.stockItemId));
    if (!item) throw new FairError(`Kus „${input.title}“ ve skladu neexistuje`);
    const [card] = await db.select({ name: s.cards.name, localId: s.cards.localId }).from(s.cards).where(eq(s.cards.id, item.cardId));
    if (card) title = `${card.name} · ${card.localId}`;
  }

  const took = item ? (await takeStock(db, [{ stockItemId: item.id, qty: input.quantity }])).missing.length === 0 : false;
  const status = !item || took ? "ok" : "conflict";
  const now = new Date();
  // prodej z budoucnosti (špatné hodiny telefonu) zapsat k času přijetí
  const soldAt = input.soldAt > now ? now : input.soldAt;
  const inserted = await db
    .insert(t)
    .values({
      id: input.id,
      receiptId: input.receiptId,
      eventName: input.eventName,
      stockItemId: item?.id ?? null,
      title,
      condition: item?.condition ?? null,
      language: item?.language ?? null,
      quantity: input.quantity,
      unitHal: input.unitHal,
      listHal: item?.priceHal ?? null,
      payment: input.payment,
      status,
      soldAt,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0) {
    // stejný prodej mezitím uložil souběžný požadavek: náš odečet vrátit
    if (took && item) await giveBack(db, [{ stockItemId: item.id, qty: input.quantity }]);
    const [row] = await db.select().from(t).where(eq(t.id, input.id));
    return { id: row.id, status: row.status, title: row.title };
  }
  return { id: input.id, status, title };
}

/** Storno prodeje: kus se vrátí do skladu (jen když se při prodeji opravdu odečetl). */
export async function cancelSale(db: Db, id: string) {
  const t = s.fairSales;
  const [row] = await db.select().from(t).where(eq(t.id, id));
  if (!row || row.status === "cancelled") throw new FairError("Prodej už je stornovaný nebo neexistuje");
  // podmínka na původní stav: dvě storna najednou nevrátí kus dvakrát
  const done = await db
    .update(t)
    .set({ status: "cancelled", resolvedAt: new Date() })
    .where(and(eq(t.id, id), eq(t.status, row.status)))
    .returning({ id: t.id });
  if (done.length === 0) throw new FairError("Prodej mezitím změnil někdo jiný, obnov stránku");
  if (row.status === "ok" && row.stockItemId) await giveBack(db, [{ stockItemId: row.stockItemId, qty: row.quantity }]);
}

/** Konflikt: zkusit kus odečíst znovu (např. po zrušení online objednávky). */
export async function retryConflict(db: Db, id: string) {
  const t = s.fairSales;
  const [row] = await db.select().from(t).where(eq(t.id, id));
  if (!row || row.status !== "conflict" || !row.stockItemId) throw new FairError("Tenhle prodej nečeká na vyřešení");
  const { missing } = await takeStock(db, [{ stockItemId: row.stockItemId, qty: row.quantity }]);
  if (missing.length > 0) throw new FairError("Kus pořád není skladem. Zkontroluj objednávky z e-shopu, nebo konflikt uzavři ručně.");
  const done = await db
    .update(t)
    .set({ status: "ok", resolvedAt: new Date() })
    .where(and(eq(t.id, id), eq(t.status, "conflict")))
    .returning({ id: t.id });
  if (done.length === 0) await giveBack(db, [{ stockItemId: row.stockItemId, qty: row.quantity }]);
}

/** Konflikt vyřešený mimo systém (např. zákazníkovi z e-shopu jste peníze vrátili). */
export async function closeConflict(db: Db, id: string) {
  const t = s.fairSales;
  const done = await db
    .update(t)
    .set({ resolvedAt: new Date() })
    .where(and(eq(t.id, id), eq(t.status, "conflict")))
    .returning({ id: t.id });
  if (done.length === 0) throw new FairError("Tenhle prodej nečeká na vyřešení");
}

export async function listSales(db: Db, since?: Date) {
  return db
    .select()
    .from(s.fairSales)
    .where(since ? gte(s.fairSales.soldAt, since) : undefined)
    .orderBy(desc(s.fairSales.soldAt))
    .limit(500);
}

/** Souhrn podle burzy: tržba celkem a podle platby (stornované se nepočítají). */
export function summarize(sales: FairSale[]) {
  const by = new Map<string, { event: string; first: Date; pieces: number; totalHal: number; cashHal: number; cardHal: number; transferHal: number; discountHal: number; conflicts: number }>();
  for (const x of sales) {
    if (x.status === "cancelled") continue;
    const e = by.get(x.eventName) ?? { event: x.eventName, first: x.soldAt, pieces: 0, totalHal: 0, cashHal: 0, cardHal: 0, transferHal: 0, discountHal: 0, conflicts: 0 };
    const line = x.unitHal * x.quantity;
    e.pieces += x.quantity;
    e.totalHal += line;
    e[`${x.payment}Hal` as "cashHal" | "cardHal" | "transferHal"] += line;
    if (x.listHal != null && x.listHal > x.unitHal) e.discountHal += (x.listHal - x.unitHal) * x.quantity;
    if (x.status === "conflict" && !x.resolvedAt) e.conflicts += 1;
    if (x.soldAt < e.first) e.first = x.soldAt;
    by.set(x.eventName, e);
  }
  return [...by.values()].sort((a, b) => b.first.getTime() - a.first.getTime());
}
