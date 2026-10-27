import { describe, expect, it } from "vitest";
import { newOrderNumber, paymentAllowed, totals, validateCheckout } from "./checkout";
import { czAccountToIban, isValidIban, spayd } from "./spayd";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const base = { email: "jan@email.cz", phone: "+420 777 123 456", name: "Jan Novák", payment: "bank_transfer", terms: "on" };

describe("doprava a platba", () => {
  it("dobírka ne při osobním odběru, karta jen se zapnutou bránou", () => {
    expect(paymentAllowed("cod", "pickup", true)).toBe(false);
    expect(paymentAllowed("cod", "zasilkovna", false)).toBe(true);
    expect(paymentAllowed("card", "zasilkovna", false)).toBe(false);
  });
  it("součty", () => {
    expect(totals(2680_00, "zasilkovna", "cod")).toEqual({ itemsHal: 2680_00, shippingHal: 79_00, codFeeHal: 39_00, totalHal: 2798_00 });
    expect(totals(500_00, "pickup", "bank_transfer").totalHal).toBe(500_00);
  });
});

describe("formulář pokladny", () => {
  it("Zásilkovna chce výdejní místo, pošta adresu", () => {
    const z = validateCheckout(form({ ...base, shipping: "zasilkovna" }), false);
    expect(z.ok).toBe(false);
    expect(!z.ok && z.errors.point).toBeTruthy();
    const p = validateCheckout(form({ ...base, shipping: "ceska_posta", street: "Dlouhá 12", city: "Praha", zip: "1100" }), false);
    expect(!p.ok && p.errors.zip).toBe("PSČ ve tvaru 110 00");
    const ok = validateCheckout(form({ ...base, shipping: "ceska_posta", street: "Dlouhá 12", city: "Praha", zip: "110 00" }), false);
    expect(ok.ok).toBe(true);
  });
  it("bez souhlasu a se špatným e-mailem neprojde, karta bez brány taky ne", () => {
    const r = validateCheckout(form({ ...base, email: "x@", terms: "", shipping: "pickup" }), false);
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["email", "terms"]);
    const c = validateCheckout(form({ ...base, shipping: "pickup", payment: "card" }), false);
    expect(!c.ok && c.errors.payment).toBeTruthy();
  });
  it("IČO jen když chce fakturu na firmu", () => {
    const r = validateCheckout(form({ ...base, shipping: "pickup", company: "on", companyId: "123" }), false);
    expect(!r.ok && r.errors.companyId).toBe("IČO má 8 číslic");
  });
});

describe("QR platba", () => {
  it("převod čísla účtu na IBAN odpovídá vzoru ČNB", () => {
    expect(czAccountToIban("19-2000145399/0800")).toBe("CZ6508000000192000145399");
    expect(isValidIban("CZ6508000000192000145399")).toBe(true);
    expect(czAccountToIban("nesmysl")).toBeNull();
  });
  it("SPAYD řetězec", () => {
    expect(spayd({ iban: "CZ6508000000192000145399", amountHal: 2798_00, vs: "2610271234", message: "PokeLou objednávka" })).toBe(
      "SPD*1.0*ACC:CZ6508000000192000145399*AM:2798.00*CC:CZK*X-VS:2610271234*MSG:PokeLou objednavka",
    );
  });
  it("číslo objednávky = variabilní symbol", () => {
    expect(newOrderNumber(new Date(2026, 9, 27), () => 0.0421)).toEqual({ number: "PL-261027-0421", vs: "2610270421" });
  });
});

describe("všechny chyby najednou", () => {
  it("prázdný formulář se Zásilkovnou ukáže i chybějící výdejní místo", () => {
    const r = validateCheckout(form({ shipping: "zasilkovna" }), false);
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["email", "name", "payment", "phone", "point", "terms"]);
  });
});
