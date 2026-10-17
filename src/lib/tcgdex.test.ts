import { describe, expect, it } from "vitest";
import { parseCnb } from "./cnb";
import { cardSchema, mapCard, mapPrices, mapSet, setSchema } from "./tcgdex";

// Tvar odpovědi podle dokumentace TCGdex (card + pricing.cardmarket).
const venusaur = cardSchema.parse({
  id: "sv03.5-198",
  localId: "198",
  name: "Venusaur ex",
  image: "https://assets.tcgdex.net/en/sv/sv03.5/198",
  category: "Pokemon",
  rarity: "Special illustration rare",
  types: ["Grass"],
  set: { id: "sv03.5", name: "151", logo: "https://assets.tcgdex.net/en/sv/sv03.5/logo" },
  variants: { normal: false, reverse: false, holo: true, firstEdition: false },
  pricing: {
    cardmarket: {
      updated: "2026-10-15T00:42:15.000Z",
      unit: "EUR",
      idProduct: 123456,
      avg: 101.5,
      low: 85,
      trend: 98.42,
      avg1: 99,
      avg7: 100.1,
      avg30: 104.9,
      "avg-holo": null,
      "trend-holo": null,
    },
    tcgplayer: { unit: "USD", holofoil: { marketPrice: 120 } },
  },
});

describe("TCGdex mapping", () => {
  it("maps a card with high-quality webp image", () => {
    expect(mapCard(venusaur)).toEqual({
      id: "sv03.5-198",
      setId: "sv03.5",
      localId: "198",
      name: "Venusaur ex",
      rarity: "Special illustration rare",
      category: "Pokemon",
      types: ["Grass"],
      imageUrl: "https://assets.tcgdex.net/en/sv/sv03.5/198/high.webp",
      cardmarketId: 123456,
    });
  });

  it("maps Cardmarket prices to daily snapshots", () => {
    const rows = mapPrices(venusaur, "2026-10-15");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ finish: "normal", trendEur: "98.42", avg30Eur: "104.90" });
  });

  it("adds a holo row when holo prices exist", () => {
    const holo = cardSchema.parse({
      ...venusaur,
      pricing: { cardmarket: { trend: 1, "trend-holo": 3.5, "avg-holo": 3 } },
    });
    expect(mapPrices(holo, "2026-10-15").map((r) => r.finish)).toEqual(["normal", "holo"]);
  });

  it("no cardmarket listing means no price rows", () => {
    expect(mapPrices(cardSchema.parse({ ...venusaur, pricing: null }), "2026-10-15")).toEqual([]);
  });

  it("accepts numeric localId and maps a set", () => {
    const s = setSchema.parse({
      id: "sv03.5",
      name: "151",
      logo: "https://assets.tcgdex.net/en/sv/sv03.5/logo",
      releaseDate: "2023-09-22",
      serie: { id: "sv", name: "Scarlet & Violet" },
      cardCount: { official: 165, total: 207 },
      abbreviation: { official: "MEW" },
      cards: [{ id: "sv03.5-1", localId: 1, name: "Bulbasaur" }],
    });
    expect(s.cards[0].localId).toBe("1");
    expect(mapSet(s)).toEqual({
      id: "sv03.5",
      code: "MEW",
      name: "151",
      series: "Scarlet & Violet",
      releaseDate: "2023-09-22",
      logoUrl: "https://assets.tcgdex.net/en/sv/sv03.5/logo.webp",
      cardCount: 165,
    });
  });
});

describe("ČNB", () => {
  it("parses the daily EUR rate", () => {
    const text = "15.10.2026 #200\nzemě|měna|množství|kód|kurz\nAustrálie|dolar|1|AUD|15,180\nEMU|euro|1|EUR|24,335\nJaponsko|jen|100|JPY|15,512\n";
    expect(parseCnb(text)).toEqual({ day: "2026-10-15", eurCzk: 24.335 });
    expect(parseCnb(text, "JPY").eurCzk).toBeCloseTo(0.15512);
  });
});
