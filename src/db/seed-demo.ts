// Naplní prázdnou databázi ukázkovým skladem z fotek klienta, aby šel celý nákup
// vyzkoušet na skutečných tabulkách. Kusy mají poznámku "demo" a smaže je
// `npx tsx scripts/remove-demo.mts`. Relativní importy kvůli spouštění přes tsx.
import { count, sql } from "drizzle-orm";
import { demoCards, demoExtra, demoLocalId, demoSetInfo, demoTrend } from "../data/demo";
import type { Db } from "./index";
import * as s from "./schema";

export const DEMO_NOTE = "demo";

export async function seedDemo(db: Db, day: string) {
  const [{ n }] = await db.select({ n: count() }).from(s.sets);
  if (n > 0) return { seeded: false as const };

  const codes = [...new Set(demoCards.map((c) => c.setCode))];
  await db.insert(s.sets).values(
    codes.map((code) => {
      const i = demoSetInfo[code];
      return { id: i.id, code, name: i.name, series: i.series, cardCount: i.cardCount, releaseDate: i.releaseDate };
    }),
  );

  const cardId = (slug: string) => {
    const c = demoCards.find((x) => x.slug === slug)!;
    return `${demoSetInfo[c.setCode].id}-${demoLocalId(c)}`;
  };

  await db.insert(s.cards).values(
    demoCards.map((c) => ({
      id: cardId(c.slug),
      setId: demoSetInfo[c.setCode].id,
      localId: demoLocalId(c),
      name: c.name,
      rarity: c.rarity,
      category: "Pokemon",
    })),
  );

  await db.insert(s.priceSnapshots).values(
    demoCards.map((c) => ({ cardId: cardId(c.slug), finish: "holo" as const, day, trendEur: demoTrend[c.slug].toFixed(2) })),
  );

  await db
    .insert(s.exchangeRates)
    .values({ day, eurCzk: "24.3000" })
    .onConflictDoNothing({ target: s.exchangeRates.day });

  // Starší kusy dřív, ať je pořadí „nejnovější“ stejné jako v ukázkových datech.
  const base = demoCards.map((c, i) => ({
    cardId: cardId(c.slug),
    language: c.lang,
    condition: c.condition,
    finish: "holo" as const,
    quantity: c.stock,
    priceHal: c.priceHal,
    wasPriceHal: c.wasPriceHal ?? null,
    priceLocked: true, // ukázkové ceny nepřepisovat denním přeceněním
    source: "own" as const,
    photos: [c.image],
    note: DEMO_NOTE,
    createdAt: sql`now() - make_interval(mins => ${i})`,
  }));
  const extra = demoExtra.map((e, i) => {
    const c = demoCards.find((x) => x.slug === e.slug)!;
    return {
      ...base[demoCards.indexOf(c)],
      language: e.lang ?? c.lang,
      condition: e.condition,
      quantity: e.stock,
      priceHal: e.priceHal,
      wasPriceHal: null,
      createdAt: sql`now() - make_interval(mins => ${100 + i})`,
    };
  });
  await db.insert(s.stockItems).values([...base, ...extra]);

  return { seeded: true as const, sets: codes.length, cards: demoCards.length, stock: base.length + extra.length };
}
