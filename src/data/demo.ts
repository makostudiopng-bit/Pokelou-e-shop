// Ukázková data pro návrh a testovací adresu, dokud není připojená databáze.
// Karty jsou skutečné kusy z fotek klienta; ceny jsou ukázkové.
import type { Condition } from "@/db/schema";

export type DemoCard = {
  slug: string;
  name: string;
  set: string;
  setCode: string;
  number: string;
  rarity: string;
  condition: Condition;
  lang: string;
  finish: string;
  priceHal: number;
  wasPriceHal?: number;
  stock: number;
  image: string;
};

export const demoCards: DemoCard[] = [
  { slug: "venusaur-ex-mew-198", name: "Venusaur ex", set: "151", setCode: "MEW", number: "198/165", rarity: "Special Illustration Rare", condition: "NM", lang: "EN", finish: "Holo", priceHal: 2490_00, stock: 2, image: "/cards/venusaur-ex-mew-198.webp" },
  { slug: "clefairy-ex-jtg-184", name: "Lillie’s Clefairy ex", set: "Journey Together", setCode: "JTG", number: "184/159", rarity: "Special Illustration Rare", condition: "NM", lang: "EN", finish: "Holo", priceHal: 1890_00, wasPriceHal: 2190_00, stock: 1, image: "/cards/clefairy-ex-jtg-184.webp" },
  { slug: "umbreon-vmax-brs-tg23", name: "Umbreon VMAX", set: "Brilliant Stars", setCode: "BRS", number: "TG23/TG30", rarity: "Trainer Gallery", condition: "EX", lang: "EN", finish: "Holo", priceHal: 1590_00, stock: 1, image: "/cards/umbreon-vmax-brs-tg23.webp" },
  { slug: "gardevoir-ex-svi-245", name: "Gardevoir ex", set: "Scarlet & Violet", setCode: "SVI", number: "245/198", rarity: "Special Illustration Rare", condition: "NM", lang: "EN", finish: "Holo", priceHal: 1490_00, stock: 2, image: "/cards/gardevoir-ex-svi-245.webp" },
  { slug: "squirtle-mew-170", name: "Squirtle", set: "151", setCode: "MEW", number: "170/165", rarity: "Illustration Rare", condition: "NM", lang: "EN", finish: "Holo", priceHal: 790_00, stock: 3, image: "/cards/squirtle-mew-170.webp" },
  { slug: "starmie-v-asr-tg13", name: "Starmie V", set: "Astral Radiance", setCode: "ASR", number: "TG13/TG30", rarity: "Trainer Gallery", condition: "EX", lang: "EN", finish: "Holo", priceHal: 890_00, wasPriceHal: 990_00, stock: 1, image: "/cards/starmie-v-asr-tg13.webp" },
  { slug: "mimikyu-v-brs-tg16", name: "Mimikyu V", set: "Brilliant Stars", setCode: "BRS", number: "TG16/TG30", rarity: "Trainer Gallery", condition: "NM", lang: "EN", finish: "Holo", priceHal: 690_00, stock: 1, image: "/cards/mimikyu-v-brs-tg16.webp" },
  { slug: "poliwhirl-mew-176", name: "Poliwhirl", set: "151", setCode: "MEW", number: "176/165", rarity: "Illustration Rare", condition: "NM", lang: "EN", finish: "Holo", priceHal: 290_00, stock: 2, image: "/cards/poliwhirl-mew-176.webp" },
  { slug: "kirlia-svi-212", name: "Kirlia", set: "Scarlet & Violet", setCode: "SVI", number: "212/198", rarity: "Illustration Rare", condition: "NM", lang: "EN", finish: "Holo", priceHal: 260_00, stock: 4, image: "/cards/kirlia-svi-212.webp" },
  { slug: "ralts-svi-211", name: "Ralts", set: "Scarlet & Violet", setCode: "SVI", number: "211/198", rarity: "Illustration Rare", condition: "EX", lang: "EN", finish: "Holo", priceHal: 190_00, stock: 0, image: "/cards/ralts-svi-211.webp" },
];

export const demoSets = [
  { name: "Journey Together", series: "Scarlet & Violet" },
  { name: "151", series: "Scarlet & Violet" },
  { name: "Scarlet & Violet", series: "Scarlet & Violet" },
  { name: "Brilliant Stars", series: "Sword & Shield" },
  { name: "Astral Radiance", series: "Sword & Shield" },
];

// ---------- Pro naplnění databáze ukázkovým skladem (src/db/seed-demo.ts) ----------

/** Edice ukázkových karet: TCGdex id a údaje. Trainer Gallery má v TCGdex vlastní „edici“. */
export const demoSetInfo: Record<string, { id: string; name: string; series: string; cardCount: number | null; releaseDate: string }> = {
  MEW: { id: "sv03.5", name: "151", series: "Scarlet & Violet", cardCount: 165, releaseDate: "2023-09-22" },
  SVI: { id: "sv01", name: "Scarlet & Violet", series: "Scarlet & Violet", cardCount: 198, releaseDate: "2023-03-31" },
  JTG: { id: "sv09", name: "Journey Together", series: "Scarlet & Violet", cardCount: 159, releaseDate: "2025-03-28" },
  BRS: { id: "swsh9tg", name: "Brilliant Stars", series: "Sword & Shield", cardCount: null, releaseDate: "2022-02-25" },
  ASR: { id: "swsh10tg", name: "Astral Radiance", series: "Sword & Shield", cardCount: null, releaseDate: "2022-05-27" },
};

/** Číslo karty v edici podle TCGdex (bez „/165“). */
export const demoLocalId = (c: DemoCard) => c.number.split("/")[0];

/** Ukázkový trend Cardmarketu v EUR. */
export const demoTrend: Record<string, number> = {
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

/** Další kusy v jiném stavu/jazyce, ať jde vyzkoušet výběr kusu. */
export const demoExtra: { slug: string; condition: Condition; lang?: string; priceHal: number; stock: number }[] = [
  { slug: "venusaur-ex-mew-198", condition: "EX", priceHal: 2090_00, stock: 1 },
  { slug: "venusaur-ex-mew-198", condition: "LP", priceHal: 1690_00, stock: 0 },
  { slug: "squirtle-mew-170", condition: "LP", priceHal: 540_00, stock: 2 },
  { slug: "umbreon-vmax-brs-tg23", condition: "NM", priceHal: 1890_00, stock: 0 },
  { slug: "gardevoir-ex-svi-245", condition: "NM", lang: "JP", priceHal: 1190_00, stock: 1 },
];
