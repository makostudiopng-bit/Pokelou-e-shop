import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Steps } from "@/components/steps";
import { PAYMENT, SHIPPING, SHOP } from "@/config/shop";
import { getDb, hasDb } from "@/db";
import { getOrder } from "@/lib/orders";
import { czAccountToIban, formatIban, isValidIban, spayd } from "@/lib/spayd";
import { tk } from "@/i18n/core";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Objednávka přijata"), robots: { index: false } };
}

function shopIban() {
  if (SHOP.bankIban && isValidIban(SHOP.bankIban)) return SHOP.bankIban.replace(/\s/g, "");
  if (SHOP.bankAccount) return czAccountToIban(SHOP.bankAccount);
  return null;
}

const NEXT_STEPS: Record<string, [string, string][]> = {
  zasilkovna: [
    [tk("Zabalíme karty"), tk("Každou do obalu a toploaderu, celé do pevné obálky.")],
    [tk("Předáme Zásilkovně"), tk("Pošleme ti e-mail se sledovacím číslem.")],
    [tk("Vyzvedneš si je"), tk("Na výdejním místě, o příchodu ti dá vědět Zásilkovna.")],
  ],
  ceska_posta: [
    [tk("Zabalíme karty"), tk("Každou do obalu a toploaderu, celé do pevné obálky.")],
    [tk("Předáme poště"), tk("Pošleme ti e-mail se sledovacím číslem.")],
    [tk("Doručí ti je domů"), tk("Balík do ruky na adresu z objednávky.")],
  ],
  pickup: [
    [tk("Připravíme karty"), tk("Každou do obalu a toploaderu.")],
    [tk("Napíšeme ti"), tk("Jakmile bude objednávka připravená k vyzvednutí.")],
    [tk("Vyzvedneš si je"), tk("Na adrese pro osobní odběr.")],
  ],
};

export default async function ObjednavkaPage({ params }: PageProps<"/objednavka/[id]">) {
  if (!hasDb()) notFound();
  const data = await getOrder(await getDb(), (await params).id);
  if (!data) notFound();
  const { order: o, items } = data;
  const t = await getT();

  const transfer = o.paymentMethod === "bank_transfer";
  const iban = transfer ? shopIban() : null;
  const qr = iban
    ? await QRCode.toString(spayd({ iban, amountHal: o.totalHal, vs: o.paymentRef ?? "", message: `PokeLou ${o.number}` }), {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#141414", light: "#ffffff" },
      })
    : null;
  const ship = SHIPPING.find((s) => s.id === o.shippingMethod);
  const pay = PAYMENT.find((p) => p.id === o.paymentMethod);
  const point = (o.shippingPoint as { name?: string } | null)?.name;
  const addr = o.address as { street?: string; city?: string; zip?: string } | null;

  return (
    <main className="mx-auto flex max-w-[1080px] flex-col gap-8 px-4 pt-8 pb-16 sm:px-6">
      <Steps current={2} />

      <section className="flex flex-wrap items-center gap-6">
        <span className="pl-sticker-num flex-none" style={{ width: 88, height: 88, fontSize: 44, transform: "rotate(-6deg)" }} aria-hidden="true">
          ✓
        </span>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
          <h1 className="m-0 text-[44px] leading-[44px] font-extrabold uppercase sm:text-[56px] sm:leading-[54px]" style={{ fontFamily: "var(--font-display)" }}>
            {t("Díky, karty jsou tvoje!")}
          </h1>
          <p className="m-0 text-[17px] leading-[26px]">
            {t("Objednávka")} <strong style={{ fontFamily: "var(--font-mono)" }}>{o.number}</strong> {t("je přijatá. Na")} <strong>{o.email}</strong> {t("ti dáme vědět, až karty odešleme.")}
          </p>
        </div>
      </section>

      {transfer && (
        <section
          aria-labelledby="pay-h"
          className="flex flex-wrap items-center gap-6 rounded-2xl p-5 sm:p-6"
          style={{ background: "var(--surface-100)", border: "2px solid var(--ink)", boxShadow: "var(--shadow-sticker)" }}
        >
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
            <h2 id="pay-h" className="m-0 text-[30px] leading-8 font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
              {t("Zaplať převodem")}
            </h2>
            <p className="m-0 text-[15px] leading-[22px]" style={{ color: "var(--ink-muted)" }}>
              {t("Naskenuj QR kód v aplikaci banky, nebo zadej údaje ručně. Karty odešleme, jakmile platba dorazí.")}
            </p>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[15px]">
              <dt style={{ color: "var(--ink-muted)" }}>{t("Částka")}</dt>
              <dd className="m-0 text-lg font-extrabold">{t.czk(o.totalHal)}</dd>
              <dt style={{ color: "var(--ink-muted)" }}>{t("Číslo účtu")}</dt>
              <dd className="m-0 font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                {SHOP.bankAccount ?? (iban ? formatIban(iban) : "[ČÍSLO ÚČTU – doplní klient]")}
              </dd>
              {iban && SHOP.bankAccount && (
                <>
                  <dt style={{ color: "var(--ink-muted)" }}>IBAN</dt>
                  <dd className="m-0" style={{ fontFamily: "var(--font-mono)" }}>
                    {formatIban(iban)}
                  </dd>
                </>
              )}
              <dt style={{ color: "var(--ink-muted)" }}>{t("Variabilní symbol")}</dt>
              <dd className="m-0 font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                {o.paymentRef}
              </dd>
            </dl>
          </div>
          {qr ? (
            <div
              role="img"
              aria-label={t("QR platba {amount}", { amount: t.czk(o.totalHal) })}
              className="w-[200px] flex-none rounded-xl p-2"
              style={{ background: "#fff", border: "2px solid var(--line)" }}
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          ) : (
            <p className="pl-note m-0 max-w-[220px]">{t("QR kód se tu objeví, jakmile doplníme číslo účtu obchodu.")}</p>
          )}
        </section>
      )}
      {o.paymentMethod === "cod" && (
        <p className="m-0 rounded-xl px-5 py-4 text-[17px]" style={{ background: "var(--surface-200)" }}>
          {t("Při převzetí zaplatíš")} <strong>{t.czk(o.totalHal)}</strong>.
        </p>
      )}

      <section aria-labelledby="next-h" className="flex flex-col gap-4">
        <h2 id="next-h" className="m-0 text-[32px] leading-9 font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {t("Co bude dál")}
        </h2>
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3">
          {(NEXT_STEPS[o.shippingMethod] ?? NEXT_STEPS.zasilkovna).map(([title, d], i) => (
            <li key={title} className={`flex flex-col gap-2 rounded-2xl p-5 ${i % 2 ? "pl-lift pl-lift--right" : "pl-lift"}`} style={{ background: "var(--surface-100)", border: "2px solid var(--line)" }}>
              <span className="pl-sticker-num pl-wiggle-child" style={{ width: 44, height: 44, fontSize: 22 }} aria-hidden="true">
                {i + 1}
              </span>
              <strong className="text-[17px]">{t(title)}</strong>
              <span className="text-sm leading-5" style={{ color: "var(--ink-muted)" }}>
                {t(d)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sum-h" className="flex flex-col gap-4 rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface-100)", border: "2px solid var(--line)" }}>
        <h2 id="sum-h" className="m-0 text-[28px] leading-8 font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          {t("Tvoje objednávka")}
        </h2>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3">
              {it.image ? <Image src={it.image} alt="" width={630} height={880} sizes="44px" className="h-auto w-11 flex-none rounded-[3px]" /> : <span className="pl-tile__ph w-11" />}
              <span className="flex min-w-0 flex-1 flex-col">
                <strong className="text-[15px]">{it.title}</strong>
                <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                  {it.condition} · {it.language} · {it.quantity} {t("ks")}
                </span>
              </span>
              <strong className="whitespace-nowrap">{t.czk(it.unitHal * it.quantity)}</strong>
            </li>
          ))}
        </ul>
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[15px]" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <dt style={{ color: "var(--ink-muted)" }}>{t("Doprava")} · {ship && t(ship.title)}</dt>
          <dd className="m-0 text-right font-bold">{o.shippingHal ? t.czk(o.shippingHal) : t("zdarma")}</dd>
          {point && (
            <>
              <dt style={{ color: "var(--ink-muted)" }}>{t("Výdejní místo")}</dt>
              <dd className="m-0 text-right">{point}</dd>
            </>
          )}
          {addr?.street && (
            <>
              <dt style={{ color: "var(--ink-muted)" }}>{t("Adresa")}</dt>
              <dd className="m-0 text-right">
                {addr.street}, {addr.zip} {addr.city}
              </dd>
            </>
          )}
          {o.shippingMethod === "pickup" && (
            <>
              <dt style={{ color: "var(--ink-muted)" }}>{t("Vyzvednutí")}</dt>
              <dd className="m-0 text-right">{SHOP.pickupAddress}</dd>
            </>
          )}
          {o.discountHal > 0 && (
            <>
              <dt style={{ color: "var(--ink-muted)" }}>{t("Sleva")} · {o.discountCode}</dt>
              <dd className="m-0 text-right font-bold" style={{ color: "var(--success)" }}>
                −{t.czk(o.discountHal)}
              </dd>
            </>
          )}
          {o.note && (
            <>
              <dt style={{ color: "var(--ink-muted)" }}>{t("Tvoje poznámka")}</dt>
              <dd className="m-0 text-right whitespace-pre-line">{o.note}</dd>
            </>
          )}
          <dt style={{ color: "var(--ink-muted)" }}>{t("Platba")} · {pay && t(pay.title)}</dt>
          <dd className="m-0 text-right font-bold">{o.codFeeHal ? `+ ${t.czk(o.codFeeHal)}` : ""}</dd>
          <dt className="font-extrabold">{t("Celkem")}</dt>
          <dd className="m-0 text-right text-lg font-extrabold">{t.czk(o.totalHal)}</dd>
        </dl>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl px-6 py-5" style={{ background: "var(--band-bg)", color: "var(--band-ink)", border: "2px solid var(--band-border)" }}>
        <div className="flex flex-col gap-1">
          <strong className="text-lg">{t("Máš doma karty, které nehraješ?")}</strong>
          <span className="text-[15px]">{t("Vykoupíme je. Za kredit dostaneš víc a můžeš ho použít na další nákup.")}</span>
        </div>
        <Link href="/vykup" className="pl-lift rounded-[10px] px-5 py-3 font-extrabold no-underline" style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)" }}>
          {t("Spočítat výkup")}
        </Link>
      </section>
    </main>
  );
}
