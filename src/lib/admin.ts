// Administrace: dotazy a změny nad databází. Ověření přihlášení dělají volající akce (requireAdmin).
import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { nextBuybackStatuses, nextOrderStatuses, restocks, type BuybackStatus, type OrderStatus } from "./admin-status";
import { latestRate, loadBuybackCards } from "./buyback";
import { giveBack } from "./orders";
import { eurToHal, resolveRules, sellPrice, type RuleValues } from "./pricing";
import { ruleFromRow } from "./sync";

export class AdminError extends Error {}

// ---------- Přehled ----------

export async function dashboardCounts(db: Db) {
  const [orders, buybacks, stock] = await Promise.all([
    db.select({ status: s.orders.status, n: count() }).from(s.orders).groupBy(s.orders.status),
    db.select({ status: s.buybackRequests.status, n: count() }).from(s.buybackRequests).groupBy(s.buybackRequests.status),
    db
      .select({ items: count(), pieces: sql<number>`coalesce(sum(${s.stockItems.quantity}), 0)::int`, value: sql<number>`coalesce(sum(${s.stockItems.quantity} * ${s.stockItems.priceHal}), 0)::bigint` })
      .from(s.stockItems),
  ]);
  const o = Object.fromEntries(orders.map((r) => [r.status, r.n])) as Partial<Record<OrderStatus, number>>;
  const b = Object.fromEntries(buybacks.map((r) => [r.status, r.n])) as Partial<Record<BuybackStatus, number>>;
  return {
    orders: o,
    buybacks: b,
    ordersToHandle: (o.new ?? 0) + (o.paid ?? 0) + (o.packed ?? 0),
    buybacksToHandle: (b.submitted ?? 0) + (b.received ?? 0) + (b.checking ?? 0) + (b.approved ?? 0),
    stock: { items: stock[0].items, pieces: Number(stock[0].pieces), valueHal: Number(stock[0].value) },
  };
}

// ---------- Objednávky ----------

export async function listOrders(db: Db, status?: OrderStatus) {
  return db
    .select({
      id: s.orders.id,
      number: s.orders.number,
      name: s.orders.name,
      email: s.orders.email,
      status: s.orders.status,
      totalHal: s.orders.totalHal,
      paymentMethod: s.orders.paymentMethod,
      shippingMethod: s.orders.shippingMethod,
      createdAt: s.orders.createdAt,
      pieces: sql<number>`(select coalesce(sum(quantity), 0)::int from order_items where order_id = ${s.orders.id})`,
    })
    .from(s.orders)
    .where(status ? eq(s.orders.status, status) : undefined)
    .orderBy(desc(s.orders.createdAt))
    .limit(200);
}

export async function setOrderStatus(db: Db, id: string, to: OrderStatus, opts: { tracking?: string } = {}) {
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, id));
  if (!order) throw new AdminError("Objednávka neexistuje");
  if (!nextOrderStatuses(order.status, order.paymentMethod).includes(to)) {
    throw new AdminError("Tenhle krok teď u objednávky nejde");
  }
  const now = new Date();
  // podmínka na původní stav: dvě okna administrace nepřepíšou jedno druhé
  const updated = await db
    .update(s.orders)
    .set({
      status: to,
      ...(to === "paid" ? { paidAt: now } : {}),
      ...(to === "shipped" ? { shippedAt: now, trackingNumber: opts.tracking?.trim() || order.trackingNumber } : {}),
      ...(to === "delivered" && order.paymentMethod === "cod" ? { paidAt: now } : {}),
    })
    .where(and(eq(s.orders.id, id), eq(s.orders.status, order.status)))
    .returning({ id: s.orders.id });
  if (updated.length === 0) throw new AdminError("Objednávku mezitím změnil někdo jiný, obnov stránku");
  if (restocks(to)) {
    const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, id));
    await giveBack(db, items.map((i) => ({ stockItemId: i.stockItemId, qty: i.quantity })));
  }
}

// ---------- Výkupy ----------

export async function listBuybacks(db: Db, status?: BuybackStatus) {
  return db
    .select({
      id: s.buybackRequests.id,
      number: s.buybackRequests.number,
      email: s.buybackRequests.email,
      name: s.buybackRequests.name,
      payout: s.buybackRequests.payout,
      status: s.buybackRequests.status,
      estimateHal: s.buybackRequests.estimateHal,
      offerHal: s.buybackRequests.offerHal,
      bulkCount: s.buybackRequests.bulkCount,
      createdAt: s.buybackRequests.createdAt,
      pieces: sql<number>`(select coalesce(sum(quantity), 0)::int from buyback_items where request_id = ${s.buybackRequests.id})`,
    })
    .from(s.buybackRequests)
    .where(status ? eq(s.buybackRequests.status, status) : undefined)
    .orderBy(desc(s.buybackRequests.createdAt))
    .limit(200);
}

export async function getBuybackAdmin(db: Db, id: string) {
  const [req] = await db.select().from(s.buybackRequests).where(eq(s.buybackRequests.id, id));
  if (!req) return null;
  const items = await db.select().from(s.buybackItems).where(eq(s.buybackItems.requestId, id));
  const cards = new Map((await loadBuybackCards(db, [...new Set(items.map((i) => i.cardId))])).map((c) => [c.id, c]));
  const stocked = await db
    .select({ buybackItemId: s.stockItems.buybackItemId })
    .from(s.stockItems)
    .where(inArray(s.stockItems.buybackItemId, items.length ? items.map((i) => i.id) : ["-"]));
  const stockedIds = new Set(stocked.map((r) => r.buybackItemId));
  return { req, items: items.map((i) => ({ ...i, card: cards.get(i.cardId) ?? null, stocked: stockedIds.has(i.id) })) };
}

/** Uloží výsledek kontroly: skutečný stav a konečnou cenu za každou položku (v haléřích za všechny kusy). */
export async function saveBuybackCheck(db: Db, id: string, checks: { itemId: string; condition: s.Condition; finalHal: number }[]) {
  const [req] = await db.select().from(s.buybackRequests).where(eq(s.buybackRequests.id, id));
  if (!req) throw new AdminError("Výkup neexistuje");
  if (!["received", "checking", "counter_offer"].includes(req.status)) throw new AdminError("Kontrolu jde upravit jen u přijatých karet");
  for (const c of checks) {
    if (!Number.isInteger(c.finalHal) || c.finalHal < 0) throw new AdminError("Konečná cena musí být celé číslo");
    await db
      .update(s.buybackItems)
      .set({ checkedCondition: c.condition, finalHal: c.finalHal })
      .where(and(eq(s.buybackItems.id, c.itemId), eq(s.buybackItems.requestId, id)));
  }
  if (req.status === "received") await db.update(s.buybackRequests).set({ status: "checking" }).where(eq(s.buybackRequests.id, id));
}

/** Součet konečných cen (u nezkontrolovaných položek odhad). */
async function offerTotal(db: Db, id: string) {
  const items = await db.select().from(s.buybackItems).where(eq(s.buybackItems.requestId, id));
  return items.reduce((a, i) => a + (i.finalHal ?? i.estimateHal), 0);
}

async function findOrCreateCustomer(db: Db, email: string, name: string | null) {
  const [existing] = await db.select().from(s.customers).where(eq(s.customers.email, email));
  if (existing) return existing;
  const [created] = await db.insert(s.customers).values({ email, name }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(s.customers).where(eq(s.customers.email, email)))[0];
}

export async function setBuybackStatus(db: Db, id: string, to: BuybackStatus) {
  const [req] = await db.select().from(s.buybackRequests).where(eq(s.buybackRequests.id, id));
  if (!req) throw new AdminError("Výkup neexistuje");
  if (!nextBuybackStatuses(req.status).includes(to)) throw new AdminError("Tenhle krok teď u výkupu nejde");
  const now = new Date();
  const patch: Partial<typeof s.buybackRequests.$inferInsert> = { status: to };
  if (to === "received") patch.receivedAt = now;
  if (to === "approved" || to === "counter_offer") {
    patch.offerHal = await offerTotal(db, id);
    patch.decidedAt = now;
  }
  if (to === "paid") patch.paidAt = now;
  const updated = await db
    .update(s.buybackRequests)
    .set(patch)
    .where(and(eq(s.buybackRequests.id, id), eq(s.buybackRequests.status, req.status)))
    .returning({ id: s.buybackRequests.id });
  if (updated.length === 0) throw new AdminError("Výkup mezitím změnil někdo jiný, obnov stránku");

  // výplata kreditem: připsat na účet zákazníka (jednou – buyback_id je v kreditu unikátní)
  if (to === "paid" && req.payout === "credit") {
    const customer = await findOrCreateCustomer(db, req.email, req.name);
    await db
      .insert(s.storeCredit)
      .values({ customerId: customer.id, amountHal: req.offerHal ?? (await offerTotal(db, id)), reason: "buyback", buybackId: id, note: req.number })
      .onConflictDoNothing();
    if (!req.customerId) await db.update(s.buybackRequests).set({ customerId: customer.id }).where(eq(s.buybackRequests.id, id));
  }
}

// ---------- Ceny a sklad ----------

async function rulesForCard(db: Db, cardId: string): Promise<RuleValues> {
  const [card] = await db.select().from(s.cards).where(eq(s.cards.id, cardId));
  const rows = await db.select().from(s.pricingRules);
  return resolveRules(
    ruleFromRow(rows.find((r) => r.scope === "global")),
    ruleFromRow(rows.find((r) => r.scope === "set" && r.setId === card?.setId)),
    ruleFromRow(rows.find((r) => r.scope === "card" && r.cardId === cardId)),
  );
}

/** Navržená prodejní cena podle posledního trendu; null, když trend neznáme. */
export async function suggestPrice(db: Db, cardId: string, finish: s.Finish, condition: s.Condition, language: string) {
  const snaps = await db.select().from(s.priceSnapshots).where(eq(s.priceSnapshots.cardId, cardId)).orderBy(desc(s.priceSnapshots.day));
  const snap = snaps.find((p) => p.finish === finish && p.trendEur != null) ?? snaps.find((p) => p.trendEur != null);
  if (!snap) return null;
  const trendHal = eurToHal(Number(snap.trendEur), await latestRate(db));
  return sellPrice({ trendHal, condition, language, rules: await rulesForCard(db, cardId) });
}

/** Naskladní vykoupené kusy (schválený nebo vyplacený výkup). Každou položku jen jednou. */
export async function stockFromBuyback(db: Db, id: string) {
  const data = await getBuybackAdmin(db, id);
  if (!data) throw new AdminError("Výkup neexistuje");
  if (!["approved", "paid"].includes(data.req.status)) throw new AdminError("Naskladnit jde jen schválený výkup");
  let added = 0;
  for (const it of data.items) {
    if (it.stocked || it.quantity <= 0) continue;
    const condition = it.checkedCondition ?? it.declaredCondition;
    const price = await suggestPrice(db, it.cardId, it.finish, condition, it.language);
    const total = it.finalHal ?? it.estimateHal;
    if (total <= 0) continue; // bulk se naskladňuje ručně
    await db
      .insert(s.stockItems)
      .values({
        cardId: it.cardId,
        language: it.language,
        condition,
        finish: it.finish,
        quantity: it.quantity,
        priceHal: price ?? Math.max(5_00, Math.round((total / it.quantity) * 2)),
        purchaseHal: Math.round(total / it.quantity),
        source: "buyback",
        buybackItemId: it.id,
      })
      .onConflictDoNothing();
    added++;
  }
  return added;
}

export async function listStock(db: Db, q = "", onlyInStock = false) {
  const tokens = q.trim().split(/\s+/).filter(Boolean).slice(0, 5).map((t) => t.replace(/[%_\\]/g, ""));
  const conds: SQL[] = tokens.map((t) => or(ilike(s.cards.name, `%${t}%`), ilike(s.cards.localId, `${t}%`), ilike(s.sets.code, t), ilike(s.sets.name, `%${t}%`))!);
  if (onlyInStock) conds.push(sql`${s.stockItems.quantity} > 0`);
  return db
    .select({ item: s.stockItems, name: s.cards.name, localId: s.cards.localId, set: s.sets.name, setCode: s.sets.code, image: s.cards.imageUrl })
    .from(s.stockItems)
    .innerJoin(s.cards, eq(s.stockItems.cardId, s.cards.id))
    .innerJoin(s.sets, eq(s.cards.setId, s.sets.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(s.stockItems.createdAt))
    .limit(300);
}

export async function updateStockItem(db: Db, id: string, patch: { priceHal: number; quantity: number; priceLocked: boolean }) {
  if (!Number.isInteger(patch.priceHal) || patch.priceHal < 100) throw new AdminError("Cena musí být aspoň 1 Kč");
  if (!Number.isInteger(patch.quantity) || patch.quantity < 0 || patch.quantity > 999) throw new AdminError("Počet 0–999 ks");
  const [item] = await db.select().from(s.stockItems).where(eq(s.stockItems.id, id));
  if (!item) throw new AdminError("Kus neexistuje");
  if (patch.quantity < item.reserved) throw new AdminError(`V košících je rezervováno ${item.reserved} ks`);
  await db
    .update(s.stockItems)
    .set({ priceHal: patch.priceHal, quantity: patch.quantity, priceLocked: patch.priceLocked, wasPriceHal: patch.priceHal < item.priceHal ? item.priceHal : null })
    .where(eq(s.stockItems.id, id));
}

export type IntakeInput = {
  cardId: string;
  condition: s.Condition;
  language: string;
  finish: s.Finish;
  quantity: number;
  priceHal?: number;
  purchaseHal?: number;
  priceLocked: boolean;
};

/** Naskladnění: stejný kus (karta, stav, jazyk, provedení, cena) se jen navýší. */
export async function intakeStock(db: Db, input: IntakeInput) {
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 999) throw new AdminError("Počet 1–999 ks");
  const [card] = await db.select().from(s.cards).where(eq(s.cards.id, input.cardId));
  if (!card) throw new AdminError("Karta není v katalogu, nejdřív naimportuj edici");
  const suggested = await suggestPrice(db, input.cardId, input.finish, input.condition, input.language);
  const priceHal = input.priceHal ?? suggested;
  if (priceHal == null || priceHal < 100) throw new AdminError("Karta nemá tržní cenu, zadej prodejní cenu ručně");

  const [same] = await db
    .select()
    .from(s.stockItems)
    .where(
      and(
        eq(s.stockItems.cardId, input.cardId),
        eq(s.stockItems.condition, input.condition),
        eq(s.stockItems.language, input.language),
        eq(s.stockItems.finish, input.finish),
        eq(s.stockItems.priceHal, priceHal),
        sql`${s.stockItems.buybackItemId} is null`,
      ),
    );
  if (same) {
    await db
      .update(s.stockItems)
      .set({ quantity: sql`${s.stockItems.quantity} + ${input.quantity}` })
      .where(eq(s.stockItems.id, same.id));
    return { id: same.id, merged: true, priceHal };
  }
  const [row] = await db
    .insert(s.stockItems)
    .values({
      cardId: input.cardId,
      condition: input.condition,
      language: input.language,
      finish: input.finish,
      quantity: input.quantity,
      priceHal,
      purchaseHal: input.purchaseHal ?? null,
      priceLocked: input.priceLocked,
      source: "purchase",
    })
    .returning({ id: s.stockItems.id });
  return { id: row.id, merged: false, priceHal };
}

export async function recentIntake(db: Db, limit = 8) {
  return db
    .select({ item: s.stockItems, name: s.cards.name, localId: s.cards.localId, setCode: s.sets.code })
    .from(s.stockItems)
    .innerJoin(s.cards, eq(s.stockItems.cardId, s.cards.id))
    .innerJoin(s.sets, eq(s.cards.setId, s.sets.id))
    .orderBy(desc(s.stockItems.updatedAt))
    .limit(limit);
}

export async function listSets(db: Db) {
  return db
    .select({ set: s.sets, cards: sql<number>`(select count(*)::int from cards where set_id = ${s.sets.id})` })
    .from(s.sets)
    .orderBy(desc(s.sets.releaseDate));
}
