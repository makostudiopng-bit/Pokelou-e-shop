import { describe, expect, it } from "vitest";
import { applyQuery, facets, matchesSearch, parseQuery, toSearch, type Offer } from "./catalog-query";

const o = (p: Partial<Offer>): Offer => ({
  id: p.id ?? Math.random().toString(36),
  cardSlug: "x",
  name: "Gardevoir ex",
  set: "Scarlet & Violet",
  setCode: "SVI",
  series: "Scarlet & Violet",
  number: "245/198",
  rarity: "Special Illustration Rare",
  condition: "NM",
  lang: "EN",
  finish: "Holo",
  priceHal: 1490_00,
  stock: 1,
  image: null,
  addedAt: 0,
  ...p,
});

describe("parseQuery", () => {
  it("čte více hodnot a zahodí neplatné", () => {
    const q = parseQuery({ stav: ["NM", "XX"], jazyk: "jp", od: "100", do: "abc", razeni: "nesmysl", strana: "-2" });
    expect(q.conditions).toEqual(["NM"]);
    expect(q.langs).toEqual(["JP"]);
    expect(q.min).toBe(100);
    expect(q.max).toBeUndefined();
    expect(q.sort).toBe("nove");
    expect(q.page).toBe(1);
  });

  it("toSearch vynechá výchozí hodnoty a zachová zbytek", () => {
    const q = parseQuery({ q: "mew", edice: ["151", "SVI"], razeni: "cena-asc", strana: "3" });
    expect(toSearch(q)).toBe("?q=mew&edice=151&edice=SVI&razeni=cena-asc");
    expect(toSearch(q, { sets: [] })).toBe("?q=mew&razeni=cena-asc");
    expect(toSearch(parseQuery({}))).toBe("");
  });
});

describe("hledání", () => {
  it("bez diakritiky, podle čísla i kódu edice", () => {
    expect(matchesSearch(o({}), "gardevoir 245/198")).toBe(true);
    expect(matchesSearch(o({}), "svi 245")).toBe(true);
    expect(matchesSearch(o({ name: "Lillie’s Clefairy ex" }), "lillies")).toBe(true);
    expect(matchesSearch(o({ name: "Pokémon Center" }), "pokemon")).toBe(true);
    expect(matchesSearch(o({}), "venusaur")).toBe(false);
  });
});

describe("applyQuery", () => {
  const offers = [
    o({ id: "a", priceHal: 300_00, condition: "EX", addedAt: 3 }),
    o({ id: "b", priceHal: 100_00, set: "151", setCode: "MEW", addedAt: 2 }),
    o({ id: "c", priceHal: 900_00, stock: 0, addedAt: 5 }),
    o({ id: "d", priceHal: 500_00, lang: "JP", addedAt: 1 }),
  ];

  it("vyprodané skryje, pokud o ně nežádáš", () => {
    expect(applyQuery(offers, parseQuery({})).items.map((x) => x.id)).toEqual(["a", "b", "d"]);
    expect(applyQuery(offers, parseQuery({ vyprodane: "1" })).items.map((x) => x.id)).toEqual(["a", "b", "d", "c"]);
  });

  it("filtruje edici podle názvu i kódu, stav, jazyk a cenu", () => {
    expect(applyQuery(offers, parseQuery({ edice: "mew" })).items.map((x) => x.id)).toEqual(["b"]);
    expect(applyQuery(offers, parseQuery({ stav: "EX" })).items.map((x) => x.id)).toEqual(["a"]);
    expect(applyQuery(offers, parseQuery({ jazyk: "JP" })).items.map((x) => x.id)).toEqual(["d"]);
    expect(applyQuery(offers, parseQuery({ od: "200", do: "400" })).items.map((x) => x.id)).toEqual(["a"]);
  });

  it("řadí podle ceny", () => {
    expect(applyQuery(offers, parseQuery({ razeni: "cena-desc" })).items.map((x) => x.id)).toEqual(["d", "a", "b"]);
  });

  it("stránkuje a nepřeteče za poslední stránku", () => {
    const many = Array.from({ length: 30 }, (_, i) => o({ id: String(i), addedAt: -i }));
    const r = applyQuery(many, parseQuery({ strana: "9" }));
    expect(r.pages).toBe(2);
    expect(r.page).toBe(2);
    expect(r.items).toHaveLength(6);
  });

  it("facety počítají kusy", () => {
    const f = facets(offers);
    expect(f.sets[0]).toEqual(["Scarlet & Violet", 3]);
    expect(f.conditions.map(([c]) => c)).toEqual(["NM", "EX"]);
  });
});
