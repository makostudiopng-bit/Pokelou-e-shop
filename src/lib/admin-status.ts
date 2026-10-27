// Stavy objednávek a výkupů: popisky a povolené přechody (čisté funkce).
import type { BUYBACK_STATUSES } from "@/db/schema";

export type OrderStatus = "new" | "paid" | "packed" | "shipped" | "delivered" | "cancelled" | "returned";
export type BuybackStatus = (typeof BUYBACK_STATUSES)[number];

export const ORDER_LABEL: Record<OrderStatus, string> = {
  new: "Nová",
  paid: "Zaplaceno",
  packed: "Zabaleno",
  shipped: "Odesláno",
  delivered: "Doručeno",
  cancelled: "Zrušeno",
  returned: "Vráceno",
};

export const ORDER_ACTION: Record<OrderStatus, string> = {
  new: "Vrátit na novou",
  paid: "Označit jako zaplacenou",
  packed: "Zabaleno",
  shipped: "Odeslat",
  delivered: "Doručeno",
  cancelled: "Zrušit objednávku",
  returned: "Zákazník vrátil",
};

/** Kam může objednávka přejít. Dobírka se balí bez platby předem. */
export function nextOrderStatuses(status: OrderStatus, payment: "card" | "bank_transfer" | "cod"): OrderStatus[] {
  switch (status) {
    case "new":
      return payment === "cod" ? ["packed", "cancelled"] : ["paid", "cancelled"];
    case "paid":
      return ["packed", "cancelled"];
    case "packed":
      return ["shipped", "cancelled"];
    case "shipped":
      return ["delivered", "returned"];
    case "delivered":
      return ["returned"];
    default:
      return [];
  }
}

/** Při zrušení nebo vrácení se kusy vrací do skladu. */
export const restocks = (to: OrderStatus) => to === "cancelled" || to === "returned";

export const BUYBACK_LABEL: Record<BuybackStatus, string> = {
  submitted: "Odesláno",
  received: "Karty přijaty",
  checking: "Kontrola",
  counter_offer: "Protinabídka",
  approved: "Schváleno",
  paid: "Vyplaceno",
  returned: "Vráceno",
  cancelled: "Zrušeno",
};

export function nextBuybackStatuses(status: BuybackStatus): BuybackStatus[] {
  switch (status) {
    case "submitted":
      return ["received", "cancelled"];
    case "received":
    case "checking":
      return ["approved", "counter_offer", "returned"];
    case "counter_offer":
      return ["approved", "returned"];
    case "approved":
      return ["paid"];
    default:
      return [];
  }
}

/** Výkup, u kterého jde ještě měnit stav a cenu kusů. */
export const buybackEditable = (s: BuybackStatus) => s === "received" || s === "checking" || s === "counter_offer";
