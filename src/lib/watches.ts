// Hlídání karty: zákazník zadá e-mail (a případně cenu), potvrdí odkazem z e-mailu
// a noční úloha mu napíše, až je karta skladem nebo za jeho cenu.
import { and, count, eq, gt, gte, isNotNull, isNull, min, sql } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { findOrCreateCustomer } from "./admin";
import { ctxFor, sendLogged } from "./email/notify";
import * as tpl from "./email/templates";

/** Kolik potvrzovacích e-mailů může jedna adresa dostat za hodinu (ochrana proti zneužití formuláře). */
export const CONFIRM_PER_HOUR = 3;
export const MAX_WATCHES_PER_EMAIL = 30;

export type WatchRequest = { email: string; cardId: string; maxPriceHal: number | null; locale: string };
export type WatchResult = "pending" | "updated" | "limit";

const cardInfo = (db: Db, cardId: string) =>
  db
    .select({ id: s.cards.id, name: s.cards.name, number: s.cards.localId, set: s.sets.name, setCode: s.sets.code, image: s.cards.imageUrl })
    .from(s.cards)
    .innerJoin(s.sets, eq(s.cards.setId, s.sets.id))
    .where(eq(s.cards.id, cardId))
    .then((r) => r[0] ?? null);

const toMail = (w: { token: string; maxPriceHal: number | null }, c: NonNullable<Awaited<ReturnType<typeof cardInfo>>>): tpl.WatchMail => ({
  token: w.token,
  cardName: c.name,
  set: c.set,
  number: c.number,
  slug: c.id,
  // TCGdex umí i PNG; Outlook WebP nezobrazí
  image: c.image ? c.image.replace(/\/high\.webp$/, "/low.png") : null,
  maxPriceHal: w.maxPriceHal,
});

async function sendConfirm(db: Db, email: string, watch: typeof s.watches.$inferSelect) {
  const since = new Date(Date.now() - 3600_000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(s.emailLog)
    .where(and(eq(s.emailLog.to, email), eq(s.emailLog.kind, "watch_confirm"), gte(s.emailLog.createdAt, since)));
  if (n >= CONFIRM_PER_HOUR) return;
  const card = await cardInfo(db, watch.cardId);
  if (!card) return;
  await sendLogged(db, "watch_confirm", null, email, tpl.watchConfirm(await ctxFor(db, watch.locale), toMail(watch, card)));
}

/** Přihlášení k hlídání. Už potvrzené hlídání jen upraví cenu, jinak pošle potvrzovací e-mail. */
export async function requestWatch(db: Db, req: WatchRequest): Promise<WatchResult> {
  const email = req.email.trim().toLowerCase();
  const customer = await findOrCreateCustomer(db, email, null);
  const [existing] = await db.select().from(s.watches).where(and(eq(s.watches.customerId, customer.id), eq(s.watches.cardId, req.cardId)));
  if (existing) {
    const [w] = await db
      .update(s.watches)
      .set({ maxPriceHal: req.maxPriceHal, locale: req.locale, notifiedHal: null })
      .where(eq(s.watches.id, existing.id))
      .returning();
    if (existing.confirmedAt) return "updated";
    await sendConfirm(db, email, w);
    return "pending";
  }
  const [{ n }] = await db.select({ n: count() }).from(s.watches).where(eq(s.watches.customerId, customer.id));
  if (n >= MAX_WATCHES_PER_EMAIL) return "limit";
  const [w] = await db.insert(s.watches).values({ customerId: customer.id, cardId: req.cardId, maxPriceHal: req.maxPriceHal, locale: req.locale }).returning();
  await sendConfirm(db, email, w);
  return "pending";
}

const TOKEN = /^[0-9a-f-]{36}$/;

export async function watchByToken(db: Db, token: string) {
  if (!TOKEN.test(token)) return null;
  const [row] = await db
    .select({ watch: s.watches, email: s.customers.email })
    .from(s.watches)
    .innerJoin(s.customers, eq(s.watches.customerId, s.customers.id))
    .where(eq(s.watches.token, token));
  if (!row) return null;
  const card = await cardInfo(db, row.watch.cardId);
  return card ? { ...row, card } : null;
}

export async function confirmWatch(db: Db, token: string) {
  if (!TOKEN.test(token)) return false;
  const r = await db
    .update(s.watches)
    .set({ confirmedAt: new Date() })
    .where(and(eq(s.watches.token, token), isNull(s.watches.confirmedAt)))
    .returning({ id: s.watches.id });
  return r.length > 0;
}

export async function cancelWatch(db: Db, token: string) {
  if (!TOKEN.test(token)) return false;
  const r = await db.delete(s.watches).where(eq(s.watches.token, token)).returning({ id: s.watches.id });
  return r.length > 0;
}

// ---------- Noční kontrola ----------

export type WatchState = { id: string; cardId: string; maxPriceHal: number | null; notifiedHal: number | null };

/**
 * Komu poslat upozornění. cheapest: nejlevnější dostupný kus každé karty (chybí = není skladem).
 * Upozorní se, když je karta skladem (a v ceně), a buď jsme ještě nepsali, nebo je teď ještě levnější.
 * Když karta zmizí ze skladu, vynuluje se notifiedHal, aby přišel e-mail i při dalším naskladnění.
 */
export function pickAlerts(watches: WatchState[], cheapest: Map<string, number>) {
  const notify: { id: string; priceHal: number }[] = [];
  const reset: string[] = [];
  for (const w of watches) {
    const price = cheapest.get(w.cardId);
    if (price == null) {
      if (w.notifiedHal != null) reset.push(w.id);
      continue;
    }
    if (w.maxPriceHal != null && price > w.maxPriceHal) continue;
    if (w.notifiedHal == null || price < w.notifiedHal) notify.push({ id: w.id, priceHal: price });
  }
  return { notify, reset };
}

export async function runWatchAlerts(db: Db, now = new Date()) {
  const watches = await db
    .select({ w: s.watches, email: s.customers.email })
    .from(s.watches)
    .innerJoin(s.customers, eq(s.watches.customerId, s.customers.id))
    .where(isNotNull(s.watches.confirmedAt));
  if (watches.length === 0) return { watches: 0, sent: 0, reset: 0 };

  const cardIds = [...new Set(watches.map((x) => x.w.cardId))];
  const prices = await db
    .select({ cardId: s.stockItems.cardId, hal: min(s.stockItems.priceHal) })
    .from(s.stockItems)
    .where(and(gt(sql`${s.stockItems.quantity} - ${s.stockItems.reserved}`, 0), sql`${s.stockItems.cardId} in ${cardIds}`))
    .groupBy(s.stockItems.cardId);
  const cheapest = new Map(prices.filter((p) => p.hal != null).map((p) => [p.cardId, Number(p.hal)]));

  const { notify, reset } = pickAlerts(
    watches.map((x) => ({ id: x.w.id, cardId: x.w.cardId, maxPriceHal: x.w.maxPriceHal, notifiedHal: x.w.notifiedHal })),
    cheapest,
  );
  for (const id of reset) await db.update(s.watches).set({ notifiedHal: null }).where(eq(s.watches.id, id));

  let sent = 0;
  const day = now.toISOString().slice(0, 10);
  for (const n of notify) {
    const row = watches.find((x) => x.w.id === n.id)!;
    const card = await cardInfo(db, row.w.cardId);
    if (!card) continue;
    const ctx = await ctxFor(db, row.w.locale);
    const stop = `${ctx.site}/api/hlidani/odhlasit?token=${row.w.token}`;
    const res = await sendLogged(db, "watch_alert", `watch:${row.w.id}:${n.priceHal}:${day}`, row.email, tpl.watchAlert(ctx, toMail(row.w, card), n.priceHal), {
      headers: { "List-Unsubscribe": `<${stop}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    // jen skutečně odeslaný e-mail se počítá; bez nastavené služby to zkusíme další noc znovu
    if (res.status === "sent") {
      sent++;
      await db.update(s.watches).set({ notifiedAt: now, notifiedHal: n.priceHal }).where(eq(s.watches.id, n.id));
    }
  }
  return { watches: watches.length, sent, reset: reset.length };
}
