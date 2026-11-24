// Překlady. Klíčem je český text (čeština je výchozí jazyk webu), anglický slovník je v en.ts.
// Chybějící překlad se ukáže česky, test i18n.test.ts hlídá, že žádný nechybí.
// Soubor běží na serveru i v prohlížeči, nesmí proto importovat nic serverového.
import { type Locale } from "./config";
import { EN } from "./en";

export * from "./config";

/** Označí text k překladu tam, kde se překládá až později (pole, konstanty). Nic nedělá, jen ho najde test. */
export const tk = <S extends string>(s: S) => s;

type Vars = Record<string, string | number>;

export type T = {
  (key: string, vars?: Vars): string;
  locale: Locale;
  /** Množné číslo: klíč „{n} karta|{n} karty|{n} karet“ (česky 1 | 2–4 | 5+), anglicky „{n} card|{n} cards“. */
  p: (n: number, key: string, vars?: Vars) => string;
  /** Cena z haléřů: „1 290 Kč“ / „1,290 CZK“. */
  czk: (hal: number) => string;
  /** Datum bez času. */
  date: (d: Date) => string;
};

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

/** Český tvar ceny, stejný jako formatCzk v lib/pricing (ta zůstává pro administraci a testy). */
function czkCs(hal: number) {
  const czk = Math.round(hal / 100);
  const sign = czk < 0 ? "−" : "";
  return `${sign}${Math.abs(czk)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} Kč`;
}

function czkEn(hal: number) {
  const czk = Math.round(hal / 100);
  // pevná mezera, ať se částka a měna nikdy nerozdělí na dva řádky
  return `${czk < 0 ? "−" : ""}${Math.abs(czk).toLocaleString("en-US")}\u00a0CZK`;
}

export function translate(locale: Locale, key: string) {
  if (locale === "cs") return key;
  const hit = EN[key];
  if (hit == null && process.env.NODE_ENV === "development") console.warn(`[i18n] chybí anglický překlad: ${JSON.stringify(key)}`);
  return hit ?? key;
}

export function makeT(locale: Locale): T {
  const t = ((key: string, vars?: Vars) => fill(translate(locale, key), vars)) as T;
  t.locale = locale;
  t.p = (n, key, vars) => {
    const forms = translate(locale, key).split("|");
    const i = locale === "cs" ? (n === 1 ? 0 : n >= 2 && n <= 4 ? 1 : 2) : n === 1 ? 0 : 1;
    return fill(forms[Math.min(i, forms.length - 1)], { n, ...vars });
  };
  t.czk = locale === "cs" ? czkCs : czkEn;
  t.date = (d) =>
    d.toLocaleDateString(locale === "cs" ? "cs-CZ" : "en-GB", locale === "cs" ? { day: "numeric", month: "numeric", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" });
  return t;
}

/**
 * Hlášky z lib/ (slevové kódy, kontrola formulářů) jsou česky. Většina jde přímo přes slovník,
 * tyhle s proměnnou částí se překládají podle vzoru.
 */
const PATTERNS: [RegExp, string][] = [
  [/^Kód platí od nákupu karet za (.+)\.$/, "This code applies to card purchases of {1} or more."],
  [/^Slevový kód (.+) už neplatí \((.+)\)\. Odebrali jsme ho, zkontroluj prosím novou cenu\.$/, "Discount code {1} is no longer valid ({2}). We removed it, please check the new price."],
  [/^(.+) Slevu jsme z objednávky odebrali, zkontroluj prosím novou cenu\.$/, "{1} We removed the discount from your order, please check the new price."],
];

/** Částky „1 290 Kč“ uvnitř hotového textu (např. popis slevy „−200 Kč“) převede do jazyka stránky. */
export function localizeCzk(locale: Locale, s: string) {
  if (locale === "cs") return s;
  return s.replace(/(−?)(\d{1,3}(?: \d{3})*) Kč/g, (_, sign, n) => czkEn(Number(n.replace(/ /g, "")) * 100 * (sign ? -1 : 1)));
}

export function translateMessage(locale: Locale, msg: string): string {
  if (locale === "cs" || EN[msg] != null) return translate(locale, msg);
  for (const [re, out] of PATTERNS) {
    const m = msg.match(re);
    if (m) {
      return out.replace(/\{(\d)\}/g, (_, i) => {
        const part = m[Number(i)];
        // vnořená hláška (důvod neplatnosti kódu) se přeloží taky; částky „1 000 Kč“ převede na anglický tvar
        if (/^−?[\d ]+ Kč$/.test(part)) return localizeCzk(locale, part);
        return translateMessage(locale, part.endsWith(".") ? part : `${part}.`).replace(/\.$/, "");
      });
    }
  }
  return translate(locale, msg);
}
