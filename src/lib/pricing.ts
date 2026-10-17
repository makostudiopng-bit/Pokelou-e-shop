// Cenotvorba prodeje a výkupu. Čisté funkce bez databáze, aby šly snadno testovat.
// Všechny částky v Kč jsou v haléřích (integer).
import type { Condition } from "@/db/schema";

export type RuleValues = {
  markupPct: number; // přirážka k tržní ceně, např. 10 = +10 %
  buybackCashPct: number; // výkup za peníze, % z tržní ceny
  buybackCreditPct: number; // výkup za kredit, % z tržní ceny
  buybackMinHal: number; // kusová hodnota, pod kterou kartu bereme jen jako bulk
  buybackMaxQty: number | null; // kolik kusů jedné karty maximálně vykoupíme
  buybackDisabled: boolean;
  conditionFactors: Record<Condition, number>;
  languageFactors: Record<string, number>;
};

/** Výchozí hodnoty, dokud klient nenastaví vlastní (ukázkové, viz specifikace). */
export const DEFAULT_RULES: RuleValues = {
  markupPct: 10,
  buybackCashPct: 50,
  buybackCreditPct: 60,
  buybackMinHal: 50_00,
  buybackMaxQty: null,
  buybackDisabled: false,
  conditionFactors: { M: 1.1, NM: 1, EX: 0.85, GD: 0.75, LP: 0.7, PL: 0.5, PO: 0.3 },
  languageFactors: { EN: 1, JP: 0.8, DE: 0.7, FR: 0.7, IT: 0.7, ES: 0.7 },
};

export type PartialRule = {
  [K in Exclude<keyof RuleValues, "conditionFactors" | "languageFactors">]?: RuleValues[K] | null;
} & {
  conditionFactors?: Partial<Record<Condition, number>> | null;
  languageFactors?: Record<string, number> | null;
};

/** Složí pravidla od obecného ke konkrétnímu: výchozí → globální → edice → karta. */
export function resolveRules(...layers: (PartialRule | null | undefined)[]): RuleValues {
  return layers.reduce<RuleValues>((acc, layer) => {
    if (!layer) return acc;
    const next: RuleValues = { ...acc };
    for (const [key, value] of Object.entries(layer)) {
      if (value === null || value === undefined) continue;
      if (key === "conditionFactors" || key === "languageFactors") continue;
      (next as Record<string, unknown>)[key] = value;
    }
    next.conditionFactors = { ...acc.conditionFactors, ...(layer.conditionFactors ?? {}) };
    next.languageFactors = { ...acc.languageFactors, ...(layer.languageFactors ?? {}) };
    return next;
  }, DEFAULT_RULES);
}

/** Tržní cena v EUR → haléře podle kurzu. */
export function eurToHal(eur: number, eurCzk: number): number {
  return Math.round(eur * eurCzk * 100);
}

/**
 * Zaokrouhlení prodejní ceny na "…90 Kč" (99 Kč → 90, 1 296 Kč → 1 290).
 * Pod 100 Kč zaokrouhlujeme na celé 5 Kč, minimum 5 Kč.
 */
export function roundSellPrice(hal: number): number {
  const czk = hal / 100;
  if (czk < 100) return Math.max(5, Math.round(czk / 5) * 5) * 100;
  return (Math.round(czk / 100) * 100 - 10) * 100;
}

/** Zaokrouhlení výkupní ceny dolů na celé Kč. */
export function roundBuybackPrice(hal: number): number {
  return Math.floor(hal / 100) * 100;
}

function languageFactor(rules: RuleValues, language: string): number {
  return rules.languageFactors[language.toUpperCase()] ?? rules.languageFactors.EN ?? 1;
}

export type SellPriceInput = {
  trendHal: number; // tržní trend už převedený na Kč (haléře)
  condition: Condition;
  language: string;
  rules: RuleValues;
};

/** Prodejní cena kusu: trend × stav × jazyk × (1 + přirážka), zaokrouhleno na …90. */
export function sellPrice({ trendHal, condition, language, rules }: SellPriceInput): number {
  const raw =
    trendHal * rules.conditionFactors[condition] * languageFactor(rules, language) * (1 + rules.markupPct / 100);
  return roundSellPrice(raw);
}

export type BuybackLineInput = {
  trendHal: number;
  condition: Condition;
  language: string;
  quantity: number;
  payout: "cash" | "credit";
  rules: RuleValues;
};

export type BuybackLine = {
  /** odhad za jeden kus */
  unitHal: number;
  /** kolik kusů vykoupíme jednotlivě (limit buybackMaxQty) */
  acceptedQty: number;
  /** odhad za všechny přijaté kusy */
  totalHal: number;
  /** kus je pod minimem – jen jako bulk za paušál */
  bulkOnly: boolean;
  /** výkup této karty je vypnutý */
  rejected: boolean;
};

/** Výkupní odhad jedné položky. */
export function buybackLine(input: BuybackLineInput): BuybackLine {
  const { trendHal, condition, language, quantity, payout, rules } = input;
  if (rules.buybackDisabled || quantity <= 0) {
    return { unitHal: 0, acceptedQty: 0, totalHal: 0, bulkOnly: false, rejected: rules.buybackDisabled };
  }
  const pct = payout === "credit" ? rules.buybackCreditPct : rules.buybackCashPct;
  const unitHal = roundBuybackPrice(
    trendHal * rules.conditionFactors[condition] * languageFactor(rules, language) * (pct / 100),
  );
  if (unitHal < rules.buybackMinHal) {
    return { unitHal, acceptedQty: 0, totalHal: 0, bulkOnly: true, rejected: false };
  }
  const acceptedQty = rules.buybackMaxQty == null ? quantity : Math.min(quantity, rules.buybackMaxQty);
  return { unitHal, acceptedQty, totalHal: unitHal * acceptedQty, bulkOnly: false, rejected: false };
}

/** Celkový odhad výkupu. */
export function buybackTotal(lines: BuybackLine[]): number {
  return lines.reduce((sum, l) => sum + l.totalHal, 0);
}

/** Formát pro zobrazení: 1 290 Kč (úzká mezera jako oddělovač tisíců). */
export function formatCzk(hal: number): string {
  const czk = Math.round(hal / 100);
  const sign = czk < 0 ? "−" : "";
  return `${sign}${Math.abs(czk)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} Kč`;
}
