"use server";
import { redirect } from "next/navigation";
import { cardPaymentEnabled } from "@/config/shop";
import { getDb, hasDb } from "@/db";
import { readCart, getCartView, getDiscount, writeCart, writeCodeCookie } from "@/lib/cart-server";
import { DiscountError } from "@/lib/discounts";
import { setQty } from "@/lib/cart";
import { getOffers } from "@/lib/catalog";
import { formToInput, validateCheckout, type FieldErrors } from "@/lib/checkout";
import { createOrder, StockConflictError } from "@/lib/orders";

export type CheckoutState = {
  attempt: number;
  errors: FieldErrors;
  values?: ReturnType<typeof formToInput>;
};

export async function placeOrderAction(prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const attempt = prev.attempt + 1;
  const v = validateCheckout(form, cardPaymentEnabled());
  if (!v.ok) return { attempt, errors: v.errors, values: v.values };

  const fail = (msg: string): CheckoutState => ({ attempt, errors: { form: msg }, values: formToInput(form) });
  const { demo } = await getOffers();
  if (!hasDb() || demo) return fail("Objednávky zatím nejde odeslat, e-shop ještě nemá napojený sklad.");

  const cart = await getCartView();
  if (cart.lines.length === 0) return fail("Košík je prázdný. Karty se mezitím mohly prodat.");

  // kód, který mezitím přestal platit, nesmí tiše zmizet: zákazník musí vidět novou cenu
  const discount = await getDiscount(cart.subtotalHal);
  if (discount.status === "invalid") {
    await writeCodeCookie("");
    return fail(`Slevový kód ${discount.code} už neplatí (${discount.reason.replace(/\.$/, "")}). Odebrali jsme ho, zkontroluj prosím novou cenu.`);
  }

  let orderId: string;
  try {
    const order = await createOrder(
      await getDb(),
      cart.lines.map((l) => ({
        stockItemId: l.id,
        qty: l.qty,
        unitHal: l.offer.priceHal,
        title: `${l.offer.name} · ${[l.offer.setCode, l.offer.number].filter(Boolean).join(" ")}`,
        condition: l.offer.condition,
        language: l.offer.lang,
      })),
      v.data,
      discount.status === "ok" ? discount.id : undefined,
    );
    orderId = order.id;
  } catch (e) {
    if (e instanceof StockConflictError) {
      // vyprodané kusy z košíku vyhodit, ať zákazník vidí aktuální stav
      let lines = await readCart();
      for (const id of e.stockItemIds) lines = setQty(lines, id, 0, 0);
      await writeCart(lines);
      return fail("Některá karta se ti mezi tím vyprodala. Upravili jsme košík, zkontroluj souhrn a odešli znovu.");
    }
    if (e instanceof DiscountError) {
      await writeCodeCookie("");
      return fail(`${e.message} Slevu jsme z objednávky odebrali, zkontroluj prosím novou cenu.`);
    }
    console.error("Objednávka se nepovedla", e);
    return fail("Objednávku se nepodařilo uložit. Zkus to prosím znovu za chvíli.");
  }

  await writeCart([]);
  await writeCodeCookie("");
  redirect(`/objednavka/${orderId}`);
}
