// Filtry a řazení katalogu jako čisté funkce: parametry z URL → výběr nabídek.
import { CONDITIONS, type Condition } from "@/db/schema";

/** Jedna nabídka = jeden skladový kus (karta v daném stavu, jazyce a provedení). */
export type Offer = {
  id: string;
  cardSlug: string;
  name: string;
  set: string;
  setCode: string;
  series: string;
  number: string;
  rarity: string;
  condition: Condition;
  lang: string;
  finish: string; // zobrazovaný název provedení, "" = běžné
  priceHal: number;
  wasPriceHal?: number;
  stock: number;
  image: string | null;
  trendEur?: number;
  addedAt: number;
};

export const SORTS = {
  nove: "Nejnovější",
  "cena-asc": "Cena vzestupně",
  "cena-desc": "Cena sestupně",
  cislo: "Číslo karty",
} as const;
export type Sort = keyof typeof SORTS;

export const PAGE_SIZE = 24;

export type CatalogQuery = {
  q: string;
  sets: string[];
  conditions: Condition[];
  langs: string[];
  finishes: string[];
  min?: number; // Kč
  max?: number; // Kč
  soldOut: boolean;
  sort: Sort;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const all = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);
const one = (v: string | string[] | undefined) => all(v)[0] ?? "";
const kc = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function parseQuery(p: Params): CatalogQuery {
  const sort = one(p.razeni);
  const page = Number.parseInt(one(p.strana), 10);
  return {
    q: one(p.q).trim().slice(0, 100),
    sets: all(p.edice),
    conditions: all(p.stav).filter((c): c is Condition => (CONDITIONS as readonly string[]).includes(c)),
    langs: all(p.jazyk).map((l) => l.toUpperCase()),
    finishes: all(p.provedeni),
    min: kc(one(p.od)),
    max: kc(one(p.do)),
    soldOut: one(p.vyprodane) === "1",
    sort: sort in SORTS ? (sort as Sort) : "nove",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Zpět na parametry URL (bez výchozích hodnot), např. pro odkazy na zrušení filtru. */
export function toSearch(q: CatalogQuery, patch: Partial<CatalogQuery> = {}) {
  const v = { ...q, page: 1, ...patch };
  const sp = new URLSearchParams();
  if (v.q) sp.set("q", v.q);
  v.sets.forEach((x) => sp.append("edice", x));
  v.conditions.forEach((x) => sp.append("stav", x));
  v.langs.forEach((x) => sp.append("jazyk", x));
  v.finishes.forEach((x) => sp.append("provedeni", x));
  if (v.min != null) sp.set("od", String(v.min));
  if (v.max != null) sp.set("do", String(v.max));
  if (v.soldOut) sp.set("vyprodane", "1");
  if (v.sort !== "nove") sp.set("razeni", v.sort);
  if (v.page > 1) sp.set("strana", String(v.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Malá písmena bez diakritiky, aby „pokemon“ našlo „Pokémon“. */
export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’']/g, "")
    .toLowerCase();

const numberKey = (n: string) => {
  const m = n.match(/^([A-Z]*)(\d+)/i);
  return m ? [m[1].toUpperCase(), Number(m[2])] as const : [n, 0] as const;
};

export function matchesSearch(o: Offer, q: string) {
  if (!q) return true;
  const hay = norm(`${o.name} ${o.number} ${o.set} ${o.setCode} ${o.rarity}`);
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

export function applyQuery(offers: Offer[], q: CatalogQuery) {
  const setKeys = new Set(q.sets.map(norm));
  const filtered = offers.filter(
    (o) =>
      (q.soldOut || o.stock > 0) &&
      matchesSearch(o, q.q) &&
      (setKeys.size === 0 || setKeys.has(norm(o.set)) || setKeys.has(norm(o.setCode))) &&
      (q.conditions.length === 0 || q.conditions.includes(o.condition)) &&
      (q.langs.length === 0 || q.langs.includes(o.lang)) &&
      (q.finishes.length === 0 || q.finishes.includes(o.finish || "Běžné")) &&
      (q.min == null || o.priceHal >= q.min * 100) &&
      (q.max == null || o.priceHal <= q.max * 100),
  );

  const byNumber = (a: Offer, b: Offer) => {
    const [pa, na] = numberKey(a.number);
    const [pb, nb] = numberKey(b.number);
    return a.set.localeCompare(b.set) || pa.localeCompare(pb) || na - nb;
  };
  const sorted = [...filtered].sort(
    {
      nove: (a: Offer, b: Offer) => b.addedAt - a.addedAt,
      "cena-asc": (a: Offer, b: Offer) => a.priceHal - b.priceHal,
      "cena-desc": (a: Offer, b: Offer) => b.priceHal - a.priceHal,
      cislo: byNumber,
    }[q.sort],
  );
  // Vyprodané vždy až na konec, ať nezaclání.
  sorted.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(q.page, pages);
  return {
    total: sorted.length,
    page,
    pages,
    items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

/** Hodnoty do filtrů (jen to, co ve skladu opravdu je) s počty kusů. */
export function facets(offers: Offer[]) {
  const count = (key: (o: Offer) => string) => {
    const m = new Map<string, number>();
    for (const o of offers) m.set(key(o), (m.get(key(o)) ?? 0) + 1);
    return m;
  };
  const sets = count((o) => o.set);
  const langs = count((o) => o.lang);
  const finishes = count((o) => o.finish || "Běžné");
  const conds = count((o) => o.condition);
  return {
    sets: [...sets].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    langs: [...langs].sort((a, b) => b[1] - a[1]),
    finishes: [...finishes].sort((a, b) => b[1] - a[1]),
    conditions: CONDITIONS.filter((c) => conds.has(c)).map((c) => [c, conds.get(c)!] as const),
  };
}
