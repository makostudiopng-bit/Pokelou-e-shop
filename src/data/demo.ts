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
