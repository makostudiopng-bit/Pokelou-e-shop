// Odeslání konkrétních e-mailů: načte data, složí šablonu, pošle a zapíše do email_log.
// Žádná funkce tady nevyhazuje chybu – nepovedený e-mail nesmí shodit objednávku ani administraci.
// Volá se přes after() z Next.js, takže zákazník na odeslání nečeká.
import { desc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { getDb, hasDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { SHOP } from "@/config/shop";
import { isLocale, makeT, type Locale } from "@/i18n/core";
import { latestRate, getBuyback } from "@/lib/buyback";
import { getOrder } from "@/lib/orders";
import { siteUrl } from "@/lib/site-url";
import { formatIban, shopIban, spayd } from "@/lib/spayd";
import { deliver, type Mail } from "./send";
import * as tpl from "./templates";

type Rendered = tpl.Rendered;

/** Komu chodí upozornění pro obchod (nové objednávky a výkupy). */
export const shopInbox = () => process.env.SHOP_NOTIFY_EMAIL?.trim() || SHOP.email;

export async function ctxFor(db: Db, locale: string): Promise<tpl.Ctx> {
  const l: Locale = isLocale(locale) ? locale : "cs";
  return { t: makeT(l, l === "cs" ? undefined : await latestRate(db)), site: siteUrl() };
}

/**
 * Pošle e-mail a zapíše výsledek. dedupeKey zajistí, že se stejný e-mail (např. potvrzení
 * objednávky) nepošle dvakrát; po chybě se klíč uvolní, aby šel poslat znovu.
 */
export async function sendLogged(
  db: Db,
  kind: string,
  dedupeKey: string | null,
  to: string,
  r: Rendered,
  extra: Pick<Mail, "replyTo" | "headers"> = {},
) {
  const [row] = await db
    .insert(s.emailLog)
    .values({ kind, to, subject: r.subject, dedupeKey, status: "skipped", error: "odesílá se" })
    .onConflictDoNothing()
    .returning({ id: s.emailLog.id });
  if (!row) return { status: "duplicate" as const };
  const res = await deliver({ to, subject: r.subject, html: r.html, text: r.text, attachments: r.attachments, ...extra }, { idempotencyKey: dedupeKey ?? undefined });
  await db
    .update(s.emailLog)
    .set({ status: res.status, providerId: res.providerId ?? null, error: res.error ?? null, ...(res.status === "failed" ? { dedupeKey: null } : {}) })
    .where(eq(s.emailLog.id, row.id));
  if (res.status === "failed") console.error(`[e-mail] ${kind} pro ${to} se nepovedl: ${res.error}`);
  return res;
}

async function safely(what: string, fn: (db: Db) => Promise<unknown>) {
  if (!hasDb()) return;
  try {
    await fn(await getDb());
  } catch (e) {
    console.error(`[e-mail] ${what} selhalo`, e);
  }
}

async function transferInfo(o: typeof s.orders.$inferSelect): Promise<tpl.TransferInfo> {
  const iban = shopIban();
  if (!iban) return null;
  const png = await QRCode.toBuffer(spayd({ iban, amountHal: o.totalHal, vs: o.paymentRef ?? "", message: `PokeLou ${o.number}` }), {
    type: "png",
    width: 280,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#141414", light: "#ffffff" },
  });
  return { account: SHOP.bankAccount ?? formatIban(iban), iban, qrPng: png.toString("base64") };
}

export function notifyOrderCreated(orderId: string) {
  return safely("potvrzení objednávky", async (db) => {
    const data = await getOrder(db, orderId);
    if (!data) return;
    const { order: o, items } = data;
    const ctx = await ctxFor(db, o.locale);
    const transfer = o.paymentMethod === "bank_transfer" ? await transferInfo(o) : null;
    await sendLogged(db, "order_created", `order:${o.id}:created`, o.email, tpl.orderCreated(ctx, o, items, transfer), { replyTo: SHOP.email });
    await sendLogged(db, "shop_order", `order:${o.id}:shop`, shopInbox(), tpl.shopOrderCreated(ctx.site, o, items, makeT("cs")), { replyTo: o.email });
  });
}

export function notifyOrderStatus(orderId: string, to: (typeof s.orders.$inferSelect)["status"]) {
  return safely("e-mail o stavu objednávky", async (db) => {
    const data = await getOrder(db, orderId);
    if (!data || data.order.status !== to) return;
    const r = tpl.orderStatus(await ctxFor(db, data.order.locale), data.order, to);
    if (r) await sendLogged(db, `order_${to}`, `order:${orderId}:${to}`, data.order.email, r, { replyTo: SHOP.email });
  });
}

async function buybackData(db: Db, id: string) {
  const data = await getBuyback(db, id);
  if (!data) return null;
  const items: tpl.BuybackLine[] = data.items.map((i) => ({
    name: i.name,
    set: i.setCode ?? i.set,
    number: i.localId,
    quantity: i.item.quantity,
    estimateHal: i.item.estimateHal,
    finalHal: i.item.finalHal,
  }));
  return { req: data.req, items };
}

export function notifyBuybackCreated(id: string) {
  return safely("potvrzení výkupu", async (db) => {
    const d = await buybackData(db, id);
    if (!d) return;
    const ctx = await ctxFor(db, d.req.locale);
    await sendLogged(db, "buyback_created", `buyback:${id}:created`, d.req.email, tpl.buybackCreated(ctx, d.req, d.items), { replyTo: SHOP.email });
    await sendLogged(db, "shop_buyback", `buyback:${id}:shop`, shopInbox(), tpl.shopBuybackCreated(ctx.site, d.req, d.items, makeT("cs")), { replyTo: d.req.email });
  });
}

export function notifyBuybackStatus(id: string, to: (typeof s.buybackRequests.$inferSelect)["status"]) {
  return safely("e-mail o stavu výkupu", async (db) => {
    const d = await buybackData(db, id);
    if (!d || d.req.status !== to) return;
    const r = tpl.buybackStatus(await ctxFor(db, d.req.locale), d.req, to, d.items);
    if (r) await sendLogged(db, `buyback_${to}`, `buyback:${id}:${to}`, d.req.email, r, { replyTo: SHOP.email });
  });
}

/** Posledních N záznamů pro administraci. */
export async function recentEmails(db: Db, limit = 100) {
  return db.select().from(s.emailLog).orderBy(desc(s.emailLog.createdAt)).limit(limit);
}
