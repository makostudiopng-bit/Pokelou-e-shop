// Ceny a povolené kombinace dopravy a platby (bez zodu, aby šly použít i v prohlížeči).
import { PAYMENT, SHIPPING, type PaymentId, type ShippingId } from "@/config/shop";

export function paymentAllowed(pay: PaymentId, ship: ShippingId, cardEnabled: boolean) {
  if (pay === "card") return cardEnabled;
  if (pay === "cod") return ship !== "pickup"; // dobírka jen při doručení
  return true;
}

export function totals(itemsHal: number, ship: ShippingId, pay: PaymentId) {
  const shippingHal = SHIPPING.find((s) => s.id === ship)?.priceHal ?? 0;
  const codFeeHal = PAYMENT.find((p) => p.id === pay)?.feeHal ?? 0;
  return { itemsHal, shippingHal, codFeeHal, totalHal: itemsHal + shippingHal + codFeeHal };
}
