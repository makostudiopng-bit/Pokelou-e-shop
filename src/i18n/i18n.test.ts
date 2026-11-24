// Hlídá anglickou verzi: každý český text, který web překládá, musí mít anglický překlad
// se stejnými proměnnými {…}. Texty se hledají přímo ve zdrojácích obchodu (t("…"), t.p(n, "…"), tk("…"))
// a hlášky z lib/ se získají spuštěním funkcí, které je vracejí.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PAYMENT, SHIPPING } from "@/config/shop";
import { SORTS } from "@/lib/catalog-query";
import { checkCode, type DiscountCode } from "@/lib/discounts";
import { validateCheckout } from "@/lib/checkout";
import { localizeCzk, makeT, translateMessage } from "./core";
import { EN } from "./en";

const ROOT = join(__dirname, "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "admin" ? [] : files(p);
    return /\.tsx?$/.test(n) && !n.endsWith(".test.ts") ? [p] : [];
  });
}

const STR = String.raw`"((?:[^"\\]|\\.)*)"`;
const PATTERNS = [
  // t("…"), tk("…"), (await getT())("…") a hlášky akcí err("…") / fail("…"), které jdou přes translateMessage
  new RegExp(String.raw`(?:\bt_?|\btk|\berr|\bfail|\(await getT\(\)\))\(\s*` + STR, "g"),
  new RegExp(String.raw`\.p\(\s*[^,()]+(?:\([^)]*\))?[^,]*,\s*` + STR, "g"),
];

function sourceKeys() {
  const keys = new Map<string, string>();
  for (const f of files(ROOT)) {
    const src = readFileSync(f, "utf8");
    for (const re of PATTERNS) for (const m of src.matchAll(re)) keys.set(JSON.parse(`"${m[1]}"`), f.replace(ROOT, "src"));
  }
  return keys;
}

const code = (patch: Partial<DiscountCode>): DiscountCode =>
  ({ id: "x", code: "X", kind: "percent", value: 10, active: true, validFrom: null, validUntil: null, maxUses: null, usedCount: 0, minOrderHal: null, ...patch }) as DiscountCode;

function libMessages() {
  const msgs = new Set<string>([
    ...Object.values(SORTS),
    ...SHIPPING.flatMap((s) => [s.title, s.note]),
    ...PAYMENT.flatMap((p) => [p.title, p.note]),
    // lib/cart-server.ts a lib/buyback.ts (importují databázi, proto vypsané ručně)
    "Slevové kódy zatím nefungují, e-shop nemá napojenou databázi.",
    "Kód teď nejde ověřit, zkus to za chvíli.",
    "Žádná z karet teď nejde vykoupit",
    "Slevový kód už neplatí.",
  ]);
  const past = new Date(2000, 0, 1);
  const future = new Date(2999, 0, 1);
  for (const c of [undefined, code({ active: false }), code({ validFrom: future }), code({ validUntil: past }), code({ maxUses: 1, usedCount: 1 })]) {
    const r = checkCode(c, 100_00);
    if (!r.ok) msgs.add(r.reason);
  }
  const forms: Record<string, string>[] = [
    {},
    { shipping: "zasilkovna" },
    { shipping: "ceska_posta", company: "on" },
    { email: "a@b.cz", phone: "777123456", name: "A", shipping: "pickup", payment: "cod", terms: "on" },
  ];
  for (const f of forms) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(f)) fd.set(k, v);
    const r = validateCheckout(fd, false);
    if (!r.ok) for (const m of Object.values(r.errors)) if (m) msgs.add(m);
  }
  return msgs;
}

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("anglická verze", () => {
  const keys = sourceKeys();

  it("najde texty ve zdrojácích", () => {
    expect(keys.size).toBeGreaterThan(200);
  });

  it("každý text z obchodu má anglický překlad", () => {
    const missing = [...keys].filter(([k]) => EN[k] == null).map(([k, f]) => `${f}: ${k}`);
    expect(missing).toEqual([]);
  });

  it("každá hláška z lib/ má anglický překlad", () => {
    const missing = [...libMessages()].filter((m) => EN[m] == null && translateMessage("en", m) === m);
    expect(missing).toEqual([]);
  });

  it("překlad má stejné proměnné a správný počet tvarů množného čísla", () => {
    const bad = Object.entries(EN).filter(([cs, en]) => {
      const csForms = cs.split("|");
      const enForms = en.split("|");
      if (csForms.length > 1 && enForms.length !== 2) return true;
      return JSON.stringify([...new Set(vars(cs))]) !== JSON.stringify([...new Set(vars(en))]);
    });
    expect(bad).toEqual([]);
  });

  it("ve slovníku nejsou nepoužívané texty", () => {
    const used = new Set([...keys.keys(), ...libMessages()]);
    expect(Object.keys(EN).filter((k) => !used.has(k))).toEqual([]);
  });
});

describe("překladová funkce", () => {
  const en = makeT("en");
  const cs = makeT("cs");

  it("česky vrací klíč a doplní proměnné", () => {
    expect(cs("Skladem {n} ks", { n: 3 })).toBe("Skladem 3 ks");
    expect(cs.czk(129000)).toBe("1 290 Kč");
  });

  it("množné číslo podle jazyka", () => {
    const k = "{n} karta|{n} karty|{n} karet";
    expect([1, 3, 7].map((n) => cs.p(n, k))).toEqual(["1 karta", "3 karty", "7 karet"]);
    expect([1, 3, 7].map((n) => en.p(n, k))).toEqual(["1 card", "3 cards", "7 cards"]);
  });

  it("ceny a hlášky s částkou v angličtině", () => {
    expect(en.czk(129000)).toBe("1,290\u00a0CZK");
    expect(localizeCzk("en", "−200 Kč")).toBe("−200\u00a0CZK");
    expect(translateMessage("en", "Kód platí od nákupu karet za 1 000 Kč.")).toBe("This code applies to card purchases of 1,000\u00a0CZK or more.");
    expect(translateMessage("en", "Slevový kód JARO už neplatí (Platnost kódu už skončila). Odebrali jsme ho, zkontroluj prosím novou cenu.")).toBe(
      "Discount code JARO is no longer valid (This code has expired). We removed it, please check the new price.",
    );
  });
});
