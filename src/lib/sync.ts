// Synchronizace katalogu, cen a kurzu + přecenění skladu.
// Funkce dostávají databázi i stahovací funkce jako parametry, aby šly testovat.
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as s from "@/db/schema";
import { fetchCnbRate, type CnbRate } from "./cnb";
import { eurToHal, resolveRules, sellPrice, type PartialRule } from "./pricing";
import { fetchCard, fetchSet, mapCard, mapPrices, mapSet, type TcgdexCard, type TcgdexSet } from "./tcgdex";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<PgQueryResultHKT, typeof s, any>;

/** Spustí úlohy s omezeným souběhem (TCGdex nechceme zahltit). */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const errors: { item: T; error: unknown }[] = [];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
        try {
          await fn(item);
        } catch (error) {
          errors.push({ item, error });
        }
      }
    }),
  );
  return errors;
}

async function upsertSet(db: Db, set: TcgdexSet) {
  const row = mapSet(set);
  await db.insert(s.sets).values(row).onConflictDoUpdate({ target: s.sets.id, set: row });
}

async function upsertCard(db: Db, card: TcgdexCard, day: string) {
  const row = mapCard(card);
  await db.insert(s.cards).values(row).onConflictDoUpdate({ target: s.cards.id, set: row });
  for (const p of mapPrices(card, day)) {
    await db
      .insert(s.priceSnapshots)
      .values(p)
      .onConflictDoUpdate({ target: [s.priceSnapshots.cardId, s.priceSnapshots.finish, s.priceSnapshots.day], set: p });
  }
}

/** Naimportuje celou edici (karty + dnešní ceny). Pomalejší, spouští se ručně nebo jednou týdně. */
export async function importSet(
  db: Db,
  setId: string,
  opts: { day: string; getSet?: typeof fetchSet; getCard?: typeof fetchCard; concurrency?: number },
) {
  const getSet = opts.getSet ?? fetchSet;
  const getCard = opts.getCard ?? fetchCard;
  const set = await getSet(setId);
  await upsertSet(db, set);
  const errors = await pool(set.cards, opts.concurrency ?? 5, async (brief) => {
    await upsertCard(db, await getCard(brief.id), opts.day);
  });
  return { set: set.id, cards: set.cards.length, failed: errors.map((e) => e.item.id) };
}

/** Karty, kterým denně stahujeme ceny: vše skladem + výkupy za posledních 30 dní. */
export async function cardsToPrice(db: Db): Promise<string[]> {
  const stock = await db.selectDistinct({ id: s.stockItems.cardId }).from(s.stockItems);
  const buyback = await db
    .selectDistinct({ id: s.buybackItems.cardId })
    .from(s.buybackItems)
    .innerJoin(s.buybackRequests, eq(s.buybackItems.requestId, s.buybackRequests.id))
    .where(sql`${s.buybackRequests.createdAt} > now() - interval '30 days'`);
  return [...new Set([...stock, ...buyback].map((r) => r.id))];
}

/** Denní stažení cen pro vybrané karty. Karty, které v DB ještě nejsou, se doplní. */
export async function syncPrices(
  db: Db,
  cardIds: string[],
  opts: { day: string; getCard?: typeof fetchCard; getSet?: typeof fetchSet; concurrency?: number },
) {
  const getCard = opts.getCard ?? fetchCard;
  const getSet = opts.getSet ?? fetchSet;
  const knownSets = new Set((await db.select({ id: s.sets.id }).from(s.sets)).map((r) => r.id));
  const errors = await pool(cardIds, opts.concurrency ?? 5, async (id) => {
    const card = await getCard(id);
    if (!knownSets.has(card.set.id)) {
      await upsertSet(db, { ...(await getSet(card.set.id)), cards: [] });
      knownSets.add(card.set.id);
    }
    await upsertCard(db, card, opts.day);
  });
  return { priced: cardIds.length - errors.length, failed: errors.map((e) => e.item) };
}

export async function syncRate(db: Db, getRate: () => Promise<CnbRate> = fetchCnbRate) {
  const rate = await getRate();
  const row = { day: rate.day, eurCzk: rate.eurCzk.toFixed(4) };
  await db.insert(s.exchangeRates).values(row).onConflictDoUpdate({ target: s.exchangeRates.day, set: row });
  return rate;
}

const toNum = (v: string | null | undefined) => (v == null ? undefined : Number(v));

function ruleFromRow(r: typeof s.pricingRules.$inferSelect | undefined): PartialRule | null {
  if (!r) return null;
  return {
    markupPct: toNum(r.markupPct),
    buybackCashPct: toNum(r.buybackCashPct),
    buybackCreditPct: toNum(r.buybackCreditPct),
    buybackMinHal: r.buybackMinHal ?? undefined,
    buybackMaxQty: r.buybackMaxQty ?? undefined,
    buybackDisabled: r.buybackDisabled ?? undefined,
    conditionFactors: r.conditionFactors,
    languageFactors: r.languageFactors,
  };
}

/**
 * Přecení všechny nezamčené kusy podle posledního trendu a kurzu.
 * Když cena klesne, stará cena se uloží pro štítek „Zlevněno“.
 */
export async function repriceStock(db: Db) {
  const [rate] = await db.select().from(s.exchangeRates).orderBy(desc(s.exchangeRates.day)).limit(1);
  if (!rate) throw new Error("Chybí kurz ČNB, nejdřív spusť syncRate");
  const eurCzk = Number(rate.eurCzk);

  const rules = await db.select().from(s.pricingRules);
  const globalRule = ruleFromRow(rules.find((r) => r.scope === "global"));

  const items = await db
    .select({ item: s.stockItems, setId: s.cards.setId })
    .from(s.stockItems)
    .innerJoin(s.cards, eq(s.stockItems.cardId, s.cards.id))
    .where(eq(s.stockItems.priceLocked, false));
  if (items.length === 0) return { updated: 0, missingPrice: [] as string[] };

  const cardIds = [...new Set(items.map((i) => i.item.cardId))];
  const snaps = await db
    .select()
    .from(s.priceSnapshots)
    .where(inArray(s.priceSnapshots.cardId, cardIds))
    .orderBy(desc(s.priceSnapshots.day));
  const latest = (cardId: string, finish: s.Finish) =>
    snaps.find((p) => p.cardId === cardId && p.finish === finish && p.trendEur != null) ??
    snaps.find((p) => p.cardId === cardId && p.finish === "normal" && p.trendEur != null);

  let updated = 0;
  const missingPrice: string[] = [];
  for (const { item, setId } of items) {
    const snap = latest(item.cardId, item.finish);
    if (!snap) {
      missingPrice.push(item.id);
      continue;
    }
    const r = resolveRules(
      globalRule,
      ruleFromRow(rules.find((x) => x.scope === "set" && x.setId === setId)),
      ruleFromRow(rules.find((x) => x.scope === "card" && x.cardId === item.cardId)),
    );
    const price = sellPrice({
      trendHal: eurToHal(Number(snap.trendEur), eurCzk),
      condition: item.condition,
      language: item.language,
      rules: r,
    });
    if (price === item.priceHal) continue;
    await db
      .update(s.stockItems)
      .set({ priceHal: price, wasPriceHal: price < item.priceHal ? item.priceHal : null })
      .where(and(eq(s.stockItems.id, item.id), eq(s.stockItems.priceLocked, false)));
    updated++;
  }
  return { updated, missingPrice };
}
