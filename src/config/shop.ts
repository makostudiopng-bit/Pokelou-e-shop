// Nastavení obchodu na jednom místě. Hodnoty označené DOČASNÉ čekají na potvrzení klientem
// a později se přesunou do administrace.

export const SHOP = {
  name: "PokeLou",
  email: process.env.SHOP_EMAIL ?? "info@pokelou.cz",
  instagram: "@pokelou.cz",
  /** DOČASNÉ: adresa pro osobní odběr */
  pickupAddress: process.env.SHOP_PICKUP_ADDRESS ?? "[ADRESA PRO OSOBNÍ ODBĚR]",
  /** DOČASNÉ: kam posílat karty k výkupu */
  buybackAddress: process.env.SHOP_BUYBACK_ADDRESS ?? "[ADRESA PRO ZASLÁNÍ KARET K VÝKUPU]",
  /** Číslo účtu pro převody: "123456789/0800" nebo rovnou IBAN v BANK_IBAN */
  bankAccount: process.env.BANK_ACCOUNT ?? null,
  bankIban: process.env.BANK_IBAN ?? null,
};

export type ShippingId = "zasilkovna" | "ceska_posta" | "pickup";
export type PaymentId = "card" | "bank_transfer" | "cod";

/** DOČASNÉ ceny z návrhu pokladny (v haléřích). */
export const SHIPPING: { id: ShippingId; title: string; note: string; priceHal: number }[] = [
  { id: "zasilkovna", title: "Zásilkovna", note: "Výdejní místo nebo Z-BOX po celé ČR", priceHal: 79_00 },
  { id: "ceska_posta", title: "Česká pošta", note: "Balík do ruky na tvou adresu", priceHal: 119_00 },
  { id: "pickup", title: "Osobní odběr", note: "Vyzvedneš si u nás, až ti napíšeme, že je objednávka připravená", priceHal: 0 },
];

/** DOČASNÉ: příplatek za dobírku. Platba kartou čeká na platební bránu. */
export const PAYMENT: { id: PaymentId; title: string; note: string; feeHal: number }[] = [
  { id: "card", title: "Kartou online", note: "Visa, Mastercard, Apple Pay, Google Pay", feeHal: 0 },
  { id: "bank_transfer", title: "Bankovní převod", note: "QR kód dostaneš hned po objednávce, karty odešleme po připsání platby", feeHal: 0 },
  { id: "cod", title: "Dobírka", note: "Zaplatíš při převzetí", feeHal: 39_00 },
];

/** Platba kartou se zapne, až bude napojená platební brána. */
export const cardPaymentEnabled = () => process.env.PAYMENT_GATEWAY === "on";
