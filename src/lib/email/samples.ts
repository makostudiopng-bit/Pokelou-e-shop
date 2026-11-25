// Ukázková data pro náhledy e-mailů v administraci a pro testy. Nic z toho není v databázi.
import type { buybackRequests, orders } from "@/db/schema";
import type { BuybackLine, WatchMail } from "./templates";

const created = new Date("2026-11-25T18:20:00+01:00");

export const sampleOrder = (patch: Partial<typeof orders.$inferSelect> = {}): typeof orders.$inferSelect => ({
  id: "00000000-0000-4000-8000-000000000001",
  number: "PL-2611-4821",
  customerId: null,
  email: "jana.novakova@example.com",
  phone: "+420 777 123 456",
  name: "Jana Nováková",
  address: null,
  companyId: null,
  status: "new",
  shippingMethod: "zasilkovna",
  shippingPoint: { name: "Z-BOX Praha 3, Seifertova 12" },
  shippingHal: 79_00,
  paymentMethod: "bank_transfer",
  codFeeHal: 0,
  creditUsedHal: 0,
  discountCode: "JARO10",
  discountHal: 189_00,
  note: "Prosím obě karty v jednom toploaderu.",
  itemsHal: 4380_00,
  totalHal: 4270_00,
  paymentRef: "2611482100",
  trackingNumber: "Z 123 4567 890",
  locale: "cs",
  createdAt: created,
  paidAt: null,
  shippedAt: null,
  ...patch,
});

export const sampleOrderItems = [
  { title: "Lillie’s Clefairy ex · JTG 184/159", condition: "NM" as const, language: "EN", quantity: 1, unitHal: 1890_00 },
  { title: "Venusaur ex · MEW 198/165", condition: "NM" as const, language: "EN", quantity: 1, unitHal: 2490_00 },
];

export const sampleBuyback = (patch: Partial<typeof buybackRequests.$inferSelect> = {}): typeof buybackRequests.$inferSelect => ({
  id: "00000000-0000-4000-8000-000000000002",
  number: "VK-261125-0042",
  customerId: null,
  email: "jana.novakova@example.com",
  name: "Jana Nováková",
  bankAccount: "123456789/0800",
  payout: "cash",
  status: "submitted",
  estimateHal: 1530_00,
  offerHal: 1380_00,
  estimateValidTo: new Date("2026-12-02T18:20:00+01:00"),
  isAdultConfirmed: true,
  bulkCount: 12,
  locale: "cs",
  createdAt: created,
  receivedAt: null,
  decidedAt: null,
  paidAt: null,
  ...patch,
});

export const sampleBuybackLines: BuybackLine[] = [
  { name: "Umbreon VMAX", set: "BRS", number: "TG23", quantity: 1, estimateHal: 1280_00, finalHal: 1130_00 },
  { name: "Gardevoir ex", set: "SVI", number: "245", quantity: 1, estimateHal: 250_00, finalHal: 250_00 },
];

export const sampleWatch = (maxPriceHal: number | null): WatchMail => ({
  token: "00000000-0000-4000-8000-000000000003",
  cardName: "Umbreon VMAX",
  set: "Brilliant Stars",
  number: "TG23",
  slug: "swsh9tg-TG23",
  image: "https://assets.tcgdex.net/en/swsh/swsh9tg/TG23/low.png",
  maxPriceHal,
});
