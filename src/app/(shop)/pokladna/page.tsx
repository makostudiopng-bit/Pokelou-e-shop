import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Steps } from "@/components/steps";
import { cardPaymentEnabled, PAYMENT, SHIPPING, SHOP } from "@/config/shop";
import { getCartView } from "@/lib/cart-server";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Doprava a platba",
  robots: { index: false },
};

export default async function PokladnaPage() {
  const cart = await getCartView();
  if (cart.lines.length === 0) redirect("/kosik");

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-8 pb-16 sm:px-6">
      <Steps current={1} />
      <h1 className="m-0 text-[40px] leading-[40px] font-extrabold sm:text-[48px] sm:leading-[48px]" style={{ fontFamily: "var(--font-display)" }}>
        Doprava a platba
      </h1>
      <CheckoutForm
        items={cart.lines.map((l) => ({
          id: l.id,
          name: l.offer.name,
          meta: [[l.offer.setCode, l.offer.number].filter(Boolean).join(" "), l.offer.condition, l.offer.lang, `${l.qty} ks`].join(" · "),
          lineHal: l.lineHal,
          image: l.offer.image,
        }))}
        subtotalHal={cart.subtotalHal}
        shipping={SHIPPING}
        payment={PAYMENT.map((p) => ({ ...p, priceHal: p.feeHal }))}
        cardEnabled={cardPaymentEnabled()}
        pickupAddress={SHOP.pickupAddress}
      />
    </main>
  );
}
