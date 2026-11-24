import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Steps } from "@/components/steps";
import { cardPaymentEnabled, PAYMENT, SHIPPING, SHOP } from "@/config/shop";
import { getCartView, getDiscount } from "@/lib/cart-server";
import { getT } from "@/i18n/server";
import { CheckoutForm } from "./checkout-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Doprava a platba"), robots: { index: false } };
}

export default async function PokladnaPage() {
  const cart = await getCartView();
  if (cart.lines.length === 0) redirect("/kosik");
  const discount = await getDiscount(cart.subtotalHal);
  const t = await getT();

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-8 pb-16 sm:px-6">
      <Steps current={1} />
      <h1 className="m-0 text-[40px] leading-[40px] font-extrabold sm:text-[48px] sm:leading-[48px]" style={{ fontFamily: "var(--font-display)" }}>
        {t("Doprava a platba")}
      </h1>
      <CheckoutForm
        items={cart.lines.map((l) => ({
          id: l.id,
          name: l.offer.name,
          meta: [[l.offer.setCode, l.offer.number].filter(Boolean).join(" "), l.offer.condition, l.offer.lang, `${l.qty} ${t("ks")}`].join(" · "),
          lineHal: l.lineHal,
          image: l.offer.image,
        }))}
        subtotalHal={cart.subtotalHal}
        discount={discount.status === "ok" ? { code: discount.code, discountHal: discount.discountHal } : undefined}
        shipping={SHIPPING.map((s) => ({ ...s, title: t(s.title), note: t(s.note) }))}
        payment={PAYMENT.map((p) => ({ ...p, title: t(p.title), note: t(p.note), priceHal: p.feeHal }))}
        cardEnabled={cardPaymentEnabled()}
        pickupAddress={SHOP.pickupAddress}
      />
    </main>
  );
}
