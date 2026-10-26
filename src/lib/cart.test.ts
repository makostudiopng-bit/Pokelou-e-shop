import { describe, expect, it } from "vitest";
import { addToCart, MAX_QTY, parseCart, resolveCart, serializeCart, setQty } from "./cart";
import type { Offer } from "./catalog-query";

const offer = (id: string, stock: number, priceHal = 100_00): Offer => ({
  id,
  cardSlug: id,
  name: id,
  set: "151",
  setCode: "MEW",
  series: "",
  number: "1/1",
  rarity: "",
  condition: "NM",
  lang: "EN",
  finish: "",
  priceHal,
  stock,
  image: null,
  addedAt: 0,
});

describe("cookie", () => {
  it("čte a zapisuje, nesmysly zahodí", () => {
    expect(parseCart("a*2|b-1*1")).toEqual([
      { id: "a", qty: 2 },
      { id: "b-1", qty: 1 },
    ]);
    expect(parseCart("a*0|*3|x y*1|c*abc|a*2|a*5|d*999")).toEqual([
      { id: "a", qty: 2 },
      { id: "d", qty: MAX_QTY },
    ]);
    expect(parseCart(undefined)).toEqual([]);
    expect(serializeCart([{ id: "a", qty: 2 }])).toBe("a*2");
  });
});

describe("přidání a změna počtu", () => {
  it("nepřidá víc, než je skladem", () => {
    let r = addToCart([], "a", 1, 2);
    expect(r).toEqual({ lines: [{ id: "a", qty: 1 }], added: 1 });
    r = addToCart(r.lines, "a", 5, 2);
    expect(r).toEqual({ lines: [{ id: "a", qty: 2 }], added: 1 });
    r = addToCart(r.lines, "a", 1, 2);
    expect(r.added).toBe(0);
    expect(addToCart([], "b", 1, 0)).toEqual({ lines: [], added: 0 });
  });

  it("setQty omezí počet a nulou odebere", () => {
    const lines = [{ id: "a", qty: 1 }];
    expect(setQty(lines, "a", 9, 3)).toEqual([{ id: "a", qty: 3 }]);
    expect(setQty(lines, "a", 0, 3)).toEqual([]);
  });
});

describe("resolveCart", () => {
  it("dopočítá ceny ze skladu, sníží počty a vyhodí vyprodané", () => {
    const r = resolveCart(
      [
        { id: "a", qty: 3 },
        { id: "b", qty: 1 },
        { id: "gone", qty: 1 },
      ],
      [offer("a", 2, 250_00), offer("b", 0)],
    );
    expect(r.lines.map((l) => [l.id, l.qty, l.adjusted])).toEqual([["a", 2, true]]);
    expect(r.subtotalHal).toBe(500_00);
    expect(r.count).toBe(2);
    expect(r.removed).toEqual(["b", "gone"]);
  });
});
