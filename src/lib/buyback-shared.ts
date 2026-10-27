// Výkup: typy a pomocné funkce, které používá prohlížeč i server.
import type { Condition } from "@/db/schema";
import { buybackLine, type RuleValues } from "./pricing";

/** Karta z vyhledávání: co potřebuje formulář k živému odhadu. */
export type BuybackCard = {
  id: string;
  name: string;
  set: string;
  setCode: string;
  number: string;
  image: string | null;
  /** tržní trend převedený na Kč (haléře); null = cenu neznáme */
  trendHal: number | null;
  rules: RuleValues;
};

export type BuybackItemInput = { cardId: string; condition: Condition; language: string; quantity: number };

export const BUYBACK_CONDITIONS: Condition[] = ["NM", "EX", "GD", "LP", "PL"];
export const BUYBACK_LANGUAGES = ["EN", "JP", "DE", "FR", "IT", "ES"];
export const BUYBACK_MAX_ITEMS = 100;
export const ESTIMATE_VALID_DAYS = 7;

export function estimateItem(card: BuybackCard, item: Omit<BuybackItemInput, "cardId">, payout: "cash" | "credit") {
  if (card.trendHal == null) return { unitHal: 0, acceptedQty: 0, totalHal: 0, bulkOnly: false, rejected: true, noPrice: true };
  return { ...buybackLine({ trendHal: card.trendHal, ...item, payout, rules: card.rules }), noPrice: false };
}
