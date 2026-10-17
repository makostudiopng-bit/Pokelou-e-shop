// Klient pro TCGdex (https://tcgdex.dev): katalog karet a ceny z Cardmarketu.
// Zdarma, bez API klíče. Ceny Cardmarketu se aktualizují denně.
import { z } from "zod";

const BASE = "https://api.tcgdex.net/v2";

const num = z.number().nullish();

export const cardmarketPricingSchema = z
  .object({
    updated: z.string().nullish(),
    unit: z.string().nullish(),
    avg: num,
    low: num,
    trend: num,
    avg1: num,
    avg7: num,
    avg30: num,
    "avg-holo": num,
    "low-holo": num,
    "trend-holo": num,
    "avg1-holo": num,
    "avg7-holo": num,
    "avg30-holo": num,
    idProduct: z.number().nullish(),
  })
  .passthrough();

export const cardSchema = z
  .object({
    id: z.string(),
    localId: z.union([z.string(), z.number()]).transform(String),
    name: z.string(),
    image: z.string().nullish(),
    category: z.string().nullish(),
    rarity: z.string().nullish(),
    types: z.array(z.string()).nullish(),
    set: z.object({ id: z.string(), name: z.string() }).passthrough(),
    variants: z
      .object({
        normal: z.boolean().nullish(),
        reverse: z.boolean().nullish(),
        holo: z.boolean().nullish(),
        firstEdition: z.boolean().nullish(),
      })
      .partial()
      .nullish(),
    pricing: z.object({ cardmarket: cardmarketPricingSchema.nullish() }).passthrough().nullish(),
  })
  .passthrough();
export type TcgdexCard = z.infer<typeof cardSchema>;

export const setSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    logo: z.string().nullish(),
    symbol: z.string().nullish(),
    releaseDate: z.string().nullish(),
    tcgOnline: z.string().nullish(),
    serie: z.object({ id: z.string(), name: z.string() }).nullish(),
    cardCount: z.object({ official: z.number().nullish(), total: z.number().nullish() }).partial().nullish(),
    abbreviation: z.object({ official: z.string().nullish() }).partial().nullish(),
    cards: z
      .array(
        z.object({
          id: z.string(),
          localId: z.union([z.string(), z.number()]).transform(String),
          name: z.string(),
          image: z.string().nullish(),
        }),
      )
      .default([]),
  })
  .passthrough();
export type TcgdexSet = z.infer<typeof setSchema>;

async function get<S extends z.ZodTypeAny>(path: string, schema: S, lang = "en"): Promise<z.output<S>> {
  const res = await fetch(`${BASE}/${lang}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`TCGdex ${path}: HTTP ${res.status}`);
  return schema.parse(await res.json());
}

export const fetchSet = (id: string, lang?: string) => get(`/sets/${encodeURIComponent(id)}`, setSchema, lang);
export const fetchCard = (id: string, lang?: string) => get(`/cards/${encodeURIComponent(id)}`, cardSchema, lang);

/** Obrázek karty: {base}/high.webp (600×825) nebo low.webp (245×337). */
export function cardImageUrl(base: string | null | undefined, quality: "high" | "low" = "high") {
  return base ? `${base}/${quality}.webp` : null;
}

/** Logo edice: {base}.webp */
export function setLogoUrl(base: string | null | undefined) {
  return base ? `${base}.webp` : null;
}

// ---------- Mapování na řádky databáze ----------

export function mapSet(s: TcgdexSet) {
  return {
    id: s.id,
    code: s.abbreviation?.official ?? s.tcgOnline ?? null,
    name: s.name,
    series: s.serie?.name ?? "",
    releaseDate: s.releaseDate ?? null,
    logoUrl: setLogoUrl(s.logo),
    cardCount: s.cardCount?.official ?? s.cardCount?.total ?? null,
  };
}

export function mapCard(c: TcgdexCard) {
  return {
    id: c.id,
    setId: c.set.id,
    localId: c.localId,
    name: c.name,
    rarity: c.rarity ?? null,
    category: c.category ?? null,
    types: c.types ?? [],
    imageUrl: cardImageUrl(c.image),
    cardmarketId: c.pricing?.cardmarket?.idProduct ?? null,
  };
}

const dec = (n: number | null | undefined) => (n == null ? null : n.toFixed(2));

/**
 * Cenové snímky pro jeden den. Standardní varianta jako "normal",
 * holo varianta (pole s příponou -holo) jako "holo", pokud ji Cardmarket má.
 */
export function mapPrices(c: TcgdexCard, day: string) {
  const cm = c.pricing?.cardmarket;
  if (!cm) return [];
  const rows = [];
  if (cm.trend != null || cm.avg != null) {
    rows.push({
      cardId: c.id,
      finish: "normal" as const,
      day,
      trendEur: dec(cm.trend),
      avgEur: dec(cm.avg),
      lowEur: dec(cm.low),
      avg7Eur: dec(cm.avg7),
      avg30Eur: dec(cm.avg30),
    });
  }
  if (cm["trend-holo"] != null || cm["avg-holo"] != null) {
    rows.push({
      cardId: c.id,
      finish: "holo" as const,
      day,
      trendEur: dec(cm["trend-holo"]),
      avgEur: dec(cm["avg-holo"]),
      lowEur: dec(cm["low-holo"]),
      avg7Eur: dec(cm["avg7-holo"]),
      avg30Eur: dec(cm["avg30-holo"]),
    });
  }
  return rows;
}
