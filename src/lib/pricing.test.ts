import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES,
  buybackLine,
  buybackTotal,
  eurToHal,
  formatCzk,
  resolveRules,
  roundSellPrice,
  sellPrice,
} from "./pricing";

const rules = DEFAULT_RULES;

describe("roundSellPrice", () => {
  it("rounds to …90 from 100 Kč up", () => {
    expect(roundSellPrice(1296_00)).toBe(1290_00);
    expect(roundSellPrice(1249_00)).toBe(1190_00);
    expect(roundSellPrice(1251_00)).toBe(1290_00);
    expect(roundSellPrice(100_00)).toBe(90_00);
  });
  it("rounds to 5 Kč below 100 Kč with a 5 Kč floor", () => {
    expect(roundSellPrice(43_00)).toBe(45_00);
    expect(roundSellPrice(1_00)).toBe(5_00);
  });
});

describe("eurToHal", () => {
  it("converts with the ČNB rate", () => {
    expect(eurToHal(10, 24.5)).toBe(245_00);
    expect(eurToHal(0.1, 24.335)).toBe(2_43);
  });
});

describe("sellPrice", () => {
  it("NM English card gets the markup", () => {
    // 1 000 Kč × 1 × 1 × 1,1 = 1 100 → 1 090
    expect(sellPrice({ trendHal: 1000_00, condition: "NM", language: "EN", rules })).toBe(1090_00);
  });
  it("condition and language lower the price", () => {
    // 1 000 × 0,85 × 0,8 × 1,1 = 748 → 690
    expect(sellPrice({ trendHal: 1000_00, condition: "EX", language: "jp", rules })).toBe(690_00);
  });
  it("unknown language falls back to EN", () => {
    expect(sellPrice({ trendHal: 1000_00, condition: "NM", language: "KR", rules })).toBe(1090_00);
  });
});

describe("resolveRules", () => {
  it("more specific layers win and factors merge", () => {
    const r = resolveRules(
      { buybackCashPct: 45 },
      { buybackCashPct: 60, conditionFactors: { EX: 0.9 } },
      { markupPct: null, buybackMaxQty: 4 },
    );
    expect(r.buybackCashPct).toBe(60);
    expect(r.markupPct).toBe(DEFAULT_RULES.markupPct);
    expect(r.buybackMaxQty).toBe(4);
    expect(r.conditionFactors.EX).toBe(0.9);
    expect(r.conditionFactors.NM).toBe(1);
  });
});

describe("buybackLine", () => {
  const base = { trendHal: 1100_00, condition: "NM" as const, language: "EN", quantity: 1, rules };

  it("cash vs credit rate", () => {
    expect(buybackLine({ ...base, payout: "cash" }).totalHal).toBe(550_00);
    expect(buybackLine({ ...base, payout: "credit" }).totalHal).toBe(660_00);
  });

  it("matches the buyback mockup (Starmie V EX × 2 at 300 Kč trend)", () => {
    const l = buybackLine({ ...base, trendHal: 300_00, condition: "EX", quantity: 2, payout: "cash" });
    expect(l.unitHal).toBe(127_00);
    expect(l.totalHal).toBe(254_00);
  });

  it("below the minimum goes to bulk", () => {
    const l = buybackLine({ ...base, trendHal: 60_00, payout: "cash" });
    expect(l.bulkOnly).toBe(true);
    expect(l.totalHal).toBe(0);
  });

  it("respects the per-card quantity limit", () => {
    const limited = resolveRules({ buybackMaxQty: 2 });
    const l = buybackLine({ ...base, quantity: 5, payout: "cash", rules: limited });
    expect(l.acceptedQty).toBe(2);
    expect(l.totalHal).toBe(1100_00);
  });

  it("disabled cards are rejected", () => {
    const off = resolveRules({ buybackDisabled: true });
    expect(buybackLine({ ...base, payout: "cash", rules: off }).rejected).toBe(true);
  });

  it("sums lines", () => {
    const lines = [
      buybackLine({ ...base, payout: "cash" }),
      buybackLine({ ...base, trendHal: 520_00, condition: "LP", payout: "cash" }),
    ];
    expect(buybackTotal(lines)).toBe(550_00 + 182_00);
  });
});

describe("formatCzk", () => {
  it("uses a thin-space thousands separator and Kč", () => {
    expect(formatCzk(2490_00)).toBe("2 490 Kč");
    expect(formatCzk(90_00)).toBe("90 Kč");
    expect(formatCzk(-250_00)).toBe("−250 Kč");
  });
});
