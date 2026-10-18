// Zdroj nabídek pro katalog: sklad v databázi, nebo ukázková data, dokud je sklad prázdný.
import { desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { demoCards } from "@/data/demo";
import type { Offer } from "./catalog-query";

export const FINISH_LABEL: Record<s.Finish, string> = {
  normal: "",
  holo: "Holo",
  reverse_holo: "Reverse Holo",
  first_edition: "1st Edition",
};

// Ukázkový trend Cardmarketu (EUR) a pár dalších kusů v jiném stavu, ať jde vyzkoušet výběr kusu.
const DEMO_TREND: Record<string, number> = {
  "venusaur-ex-mew-198": 88,
  "clefairy-ex-jtg-184": 67,
  "umbreon-vmax-brs-tg23": 66,
  "gardevoir-ex-svi-245": 53,
  "squirtle-mew-170": 28,
  "starmie-v-asr-tg13": 37,
  "mimikyu-v-brs-tg16": 24,
  "poliwhirl-mew-176": 10,
  "kirlia-svi-212": 9,
  "ralts-svi-211": 8,
};
const DEMO_EXTRA: { slug: string; condition: s.Condition; lang?: string; priceHal: number; stock: number }[] = [
  { slug: "venusaur-ex-mew-198", condition: "EX", priceHal: 2090_00, stock: 1 },
  { slug: "venusaur-ex-mew-198", condition: "LP", priceHal: 1690_00, stock: 0 },
  { slug: "squirtle-mew-170", condition: "LP", priceHal: 540_00, stock: 2 },
  { slug: "umbreon-vmax-brs-tg23", condition: "NM", priceHal: 1890_00, stock: 0 },
  { slug: "gardevoir-ex-svi-245", condition: "NM", lang: "JP", priceHal: 1190_00, stock: 1 },
];

function demoOffers(): Offer[] {
  const base = demoCards.map((c, i) => ({
    id: `${c.slug}-${c.condition}-${c.lang}`,
    cardSlug: c.slug,
    name: c.name,
    set: c.set,
    setCode: c.setCode,
    series: c.set === "Brilliant Stars" || c.set === "Astral Radiance" ? "Sword & Shield" : "Scarlet & Violet",
    number: c.number,
    rarity: c.rarity,
    condition: c.condition,
    lang: c.lang,
    finish: c.finish,
    priceHal: c.priceHal,
    wasPriceHal: c.wasPriceHal,
    stock: c.stock,
    image: c.image,
    trendEur: DEMO_TREND[c.slug],
    addedAt: 1000 - i,
  }));
  const extra = DEMO_EXTRA.map((e, i) => {
    const b = base.find((o) => o.cardSlug === e.slug)!;
    const lang = e.lang ?? b.lang;
    return { ...b, id: `${e.slug}-${e.condition}-${lang}`, condition: e.condition, lang, priceHal: e.priceHal, wasPriceHal: undefined, stock: e.stock, addedAt: 500 - i };
  });
  return [...base, ...extra];
}

async function dbOffers(): Promise<Offer[]> {
  const db = getDb();
  const rows = await db
    .select({ item: s.stockItems, card: s.cards, set: s.sets })
    .from(s.stockItems)
    .innerJoin(s.cards, eq(s.stockItems.cardId, s.cards.id))
    .innerJoin(s.sets, eq(s.cards.setId, s.sets.id));
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.card.id))];
  const snaps = await db
    .select({ cardId: s.priceSnapshots.cardId, finish: s.priceSnapshots.finish, trend: s.priceSnapshots.trendEur })
    .from(s.priceSnapshots)
    .where(inArray(s.priceSnapshots.cardId, ids))
    .orderBy(desc(s.priceSnapshots.day));
  const trend = (cardId: string, finish: s.Finish) => {
    const p =
      snaps.find((x) => x.cardId === cardId && x.finish === finish && x.trend != null) ??
      snaps.find((x) => x.cardId === cardId && x.trend != null);
    return p ? Number(p.trend) : undefined;
  };

  return rows.map(({ item, card, set }) => ({
    id: item.id,
    cardSlug: card.id,
    name: card.name,
    set: set.name,
    setCode: set.code ?? "",
    series: set.series,
    number: set.cardCount ? `${card.localId}/${set.cardCount}` : card.localId,
    rarity: card.rarity ?? "",
    condition: item.condition,
    lang: item.language,
    finish: FINISH_LABEL[item.finish],
    priceHal: item.priceHal,
    wasPriceHal: item.wasPriceHal ?? undefined,
    stock: Math.max(0, item.quantity - item.reserved),
    image: item.photos[0] ?? card.imageUrl,
    trendEur: trend(card.id, item.finish),
    addedAt: item.createdAt.getTime(),
  }));
}

/** Všechny nabídky (i vyprodané). Jedno načtení na požadavek díky cache(). */
export const getOffers = cache(async (): Promise<{ offers: Offer[]; demo: boolean }> => {
  if (process.env.DATABASE_URL) {
    try {
      const offers = await dbOffers();
      if (offers.length > 0) return { offers, demo: false };
    } catch (e) {
      console.error("Katalog: databáze nedostupná, ukazuji ukázková data", e);
    }
  }
  return { offers: demoOffers(), demo: true };
});

export async function getCard(slug: string) {
  const { offers, demo } = await getOffers();
  const variants = offers.filter((o) => o.cardSlug === slug);
  if (variants.length === 0) return null;
  const related = offers.filter((o) => o.cardSlug !== slug && o.stock > 0);
  const seen = new Set<string>();
  const more = [...related.filter((o) => o.set === variants[0].set), ...related.filter((o) => o.set !== variants[0].set)]
    .filter((o) => !seen.has(o.cardSlug) && seen.add(o.cardSlug))
    .slice(0, 5);
  return { variants, more, demo };
}
