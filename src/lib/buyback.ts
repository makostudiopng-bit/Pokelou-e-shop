// Výkup na serveru: hledání karet v katalogu, pravidla, přepočet odhadu a uložení žádosti.
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { demoCards, demoTrend } from "@/data/demo";
import { BUYBACK_MAX_ITEMS, ESTIMATE_VALID_DAYS, estimateItem, type BuybackCard, type BuybackItemInput } from "./buyback-shared";
import { DEFAULT_RULES, eurToHal, resolveRules, type RuleValues } from "./pricing";
import { ruleFromRow } from "./sync";

export const FALLBACK_EUR_CZK = 24.3;

export async function latestRate(db: Db) {
  const [r] = await db.select().from(s.exchangeRates).orderBy(desc(s.exchangeRates.day)).limit(1);
  return r ? Number(r.eurCzk) : FALLBACK_EUR_CZK;
}

const FINISH_PREF: s.Finish[] = ["normal", "holo", "reverse_holo", "first_edition"];

/** Pravidla pro sadu karet (globální → edice → karta). */
async function rulesFor(db: Db, cards: { id: string; setId: string }[]) {
  const rows = await db.select().from(s.pricingRules);
  const global = ruleFromRow(rows.find((r) => r.scope === "global"));
  return new Map<string, RuleValues>(
    cards.map((c) => [
      c.id,
      resolveRules(
        global,
        ruleFromRow(rows.find((r) => r.scope === "set" && r.setId === c.setId)),
        ruleFromRow(rows.find((r) => r.scope === "card" && r.cardId === c.id)),
      ),
    ]),
  );
}

/** Načte karty podle ID včetně trendu a pravidel. */
export async function loadBuybackCards(db: Db, ids: string[]): Promise<BuybackCard[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ card: s.cards, set: s.sets })
    .from(s.cards)
    .innerJoin(s.sets, eq(s.cards.setId, s.sets.id))
    .where(inArray(s.cards.id, ids));
  return enrich(db, rows);
}

async function enrich(db: Db, rows: { card: typeof s.cards.$inferSelect; set: typeof s.sets.$inferSelect }[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.card.id);
  const [snaps, rate, rules, photos] = await Promise.all([
    db
      .select({ cardId: s.priceSnapshots.cardId, finish: s.priceSnapshots.finish, trend: s.priceSnapshots.trendEur, day: s.priceSnapshots.day })
      .from(s.priceSnapshots)
      .where(inArray(s.priceSnapshots.cardId, ids))
      .orderBy(desc(s.priceSnapshots.day)),
    latestRate(db),
    rulesFor(db, rows.map((r) => ({ id: r.card.id, setId: r.set.id }))),
    // naše vlastní fotka kusu, když katalog nemá obrázek
    db.select({ cardId: s.stockItems.cardId, photos: s.stockItems.photos }).from(s.stockItems).where(inArray(s.stockItems.cardId, ids)),
  ]);
  return rows.map(({ card, set }) => {
    const mine = snaps.filter((p) => p.cardId === card.id && p.trend != null);
    const day = mine[0]?.day;
    const snap = FINISH_PREF.map((f) => mine.find((p) => p.day === day && p.finish === f)).find(Boolean);
    return {
      id: card.id,
      name: card.name,
      set: set.name,
      setCode: set.code ?? "",
      number: set.cardCount ? `${card.localId}/${set.cardCount}` : card.localId,
      image: card.imageUrl ?? photos.find((p) => p.cardId === card.id && p.photos[0])?.photos[0] ?? null,
      trendHal: snap ? eurToHal(Number(snap.trend), rate) : null,
      rules: rules.get(card.id) ?? DEFAULT_RULES,
    };
  });
}

/** Hledání v celém katalogu: každé slovo musí sedět na název, číslo nebo edici. */
export async function searchBuybackCards(db: Db, q: string, limit = 12): Promise<BuybackCard[]> {
  const tokens = q
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[%_\\]/g, "").split("/")[0])
    .filter((t) => t.length > 0)
    .slice(0, 5);
  if (tokens.length === 0) return [];
  const conds: SQL[] = tokens.map(
    (t) =>
      or(
        ilike(s.cards.name, `%${t}%`),
        ilike(s.cards.localId, `${t}%`),
        ilike(s.sets.code, t),
        ilike(s.sets.name, `%${t}%`),
      )!,
  );
  const rows = await db
    .select({ card: s.cards, set: s.sets })
    .from(s.cards)
    .innerJoin(s.sets, eq(s.cards.setId, s.sets.id))
    .where(and(...conds))
    .orderBy(sql`length(${s.cards.name})`, desc(s.sets.releaseDate))
    .limit(limit);
  return enrich(db, rows);
}

/** Bez databáze: hledání v ukázkových kartách (jen pro náhled). */
export function searchDemoCards(q: string): BuybackCard[] {
  const t = q.toLowerCase().split(/\s+/).filter(Boolean);
  return demoCards
    .filter((c) => t.every((x) => `${c.name} ${c.number} ${c.set} ${c.setCode}`.toLowerCase().includes(x)))
    .slice(0, 12)
    .map((c) => ({
      id: c.slug,
      name: c.name,
      set: c.set,
      setCode: c.setCode,
      number: c.number,
      image: c.image,
      trendHal: eurToHal(demoTrend[c.slug], FALLBACK_EUR_CZK),
      rules: DEFAULT_RULES,
    }));
}

export type BuybackSubmit = {
  email: string;
  name?: string;
  payout: "cash" | "credit";
  bankAccount?: string;
  items: BuybackItemInput[];
};

/** Přepočítá odhad na serveru (klientovi nevěříme) a uloží žádost. */
export async function createBuyback(db: Db, input: BuybackSubmit, now = new Date()) {
  const items = input.items.slice(0, BUYBACK_MAX_ITEMS);
  const cards = new Map((await loadBuybackCards(db, [...new Set(items.map((i) => i.cardId))])).map((c) => [c.id, c]));
  const priced = items
    .filter((i) => cards.has(i.cardId))
    .map((i) => ({ i, est: estimateItem(cards.get(i.cardId)!, i, input.payout) }));
  const accepted = priced.filter((p) => p.est.acceptedQty > 0);
  const bulkCount = priced.filter((p) => p.est.bulkOnly).reduce((a, p) => a + p.i.quantity, 0);
  if (accepted.length === 0 && bulkCount === 0) throw new Error("Žádná z karet teď nejde vykoupit");

  const estimateHal = accepted.reduce((a, p) => a + p.est.totalHal, 0);
  const validTo = new Date(now.getTime() + ESTIMATE_VALID_DAYS * 86_400_000);

  for (let attempt = 0; ; attempt++) {
    const p = (n: number) => String(n).padStart(2, "0");
    const number = `VK-${String(now.getFullYear()).slice(2)}${p(now.getMonth() + 1)}${p(now.getDate())}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    try {
      const [req] = await db
        .insert(s.buybackRequests)
        .values({
          number,
          email: input.email.toLowerCase(),
          name: input.name || null,
          bankAccount: input.payout === "cash" ? input.bankAccount : null,
          payout: input.payout,
          estimateHal,
          estimateValidTo: validTo,
          isAdultConfirmed: true,
          bulkCount,
        })
        .returning();
      await db.insert(s.buybackItems).values(
        priced.map(({ i, est }) => ({
          requestId: req.id,
          cardId: i.cardId,
          language: i.language,
          quantity: i.quantity,
          declaredCondition: i.condition,
          estimateHal: est.totalHal,
        })),
      );
      return req;
    } catch (e) {
      const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
      if (code === "23505" && attempt < 4) continue;
      throw e;
    }
  }
}

export async function getBuyback(db: Db, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [req] = await db.select().from(s.buybackRequests).where(eq(s.buybackRequests.id, id));
  if (!req) return null;
  const items = await db
    .select({ item: s.buybackItems, name: s.cards.name, localId: s.cards.localId, set: s.sets.name, setCode: s.sets.code })
    .from(s.buybackItems)
    .innerJoin(s.cards, eq(s.buybackItems.cardId, s.cards.id))
    .innerJoin(s.sets, eq(s.cards.setId, s.sets.id))
    .where(eq(s.buybackItems.requestId, id));
  return { req, items };
}
