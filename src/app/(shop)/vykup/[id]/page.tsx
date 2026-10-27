import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConditionBadge } from "@/components/ui";
import { SHOP } from "@/config/shop";
import { getDb, hasDb } from "@/db";
import { getBuyback } from "@/lib/buyback";
import { formatCzk } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Výkup přijat",
  robots: { index: false },
};

export default async function VykupPotvrzeniPage({ params }: PageProps<"/vykup/[id]">) {
  if (!hasDb()) notFound();
  const data = await getBuyback(await getDb(), (await params).id);
  if (!data) notFound();
  const { req, items } = data;
  const validTo = req.estimateValidTo.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

  return (
    <main className="mx-auto flex max-w-[1080px] flex-col gap-8 px-4 pt-8 pb-16 sm:px-6">
      <section className="flex flex-wrap items-center gap-6">
        <span className="pl-sticker-num flex-none" style={{ width: 88, height: 88, fontSize: 44, transform: "rotate(-6deg)" }} aria-hidden="true">
          ✓
        </span>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
          <h1 className="m-0 text-[44px] leading-[44px] font-extrabold uppercase sm:text-[56px] sm:leading-[54px]" style={{ fontFamily: "var(--font-display)" }}>
            Výkup máme zapsaný
          </h1>
          <p className="m-0 text-[17px] leading-[26px]">
            Číslo výkupu <strong style={{ fontFamily: "var(--font-mono)" }}>{req.number}</strong>. Odhad{" "}
            <strong>{formatCzk(req.estimateHal)}</strong> {req.payout === "credit" ? "v kreditu" : "na účet"} platí do {validTo}.
          </p>
        </div>
      </section>

      <section aria-labelledby="send-h" className="flex flex-col gap-4 rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface-100)", border: "2px solid var(--ink)", boxShadow: "var(--shadow-sticker)" }}>
        <h2 id="send-h" className="m-0 text-[30px] leading-8 font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Jak nám karty poslat
        </h2>
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3">
          {[
            ["Zabal karty", "Každou do obalu, dražší i do toploaderu. Celé do pevné obálky nebo krabičky."],
            ["Přilož číslo výkupu", `Na lísteček napiš ${req.number}, ať karty hned spárujeme.`],
            ["Pošli nebo přines", SHOP.buybackAddress],
          ].map(([t, d], i) => (
            <li key={t} className="flex flex-col gap-2">
              <span className="pl-sticker-num" style={{ width: 44, height: 44, fontSize: 22 }} aria-hidden="true">
                {i + 1}
              </span>
              <strong className="text-[17px]">{t}</strong>
              <span className="text-sm leading-5" style={{ color: "var(--ink-muted)" }}>
                {d}
              </span>
            </li>
          ))}
        </ol>
        <p className="pl-note m-0">
          Po doručení karty zkontrolujeme. Když stav sedí, {req.payout === "credit" ? "připíšeme kredit" : "pošleme peníze na účet"}. Když ne, napíšeme ti protinabídku, nebo ti karty vrátíme.
        </p>
      </section>

      <section aria-labelledby="items-h" className="flex flex-col gap-3 rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface-100)", border: "2px solid var(--line)" }}>
        <h2 id="items-h" className="m-0 text-[28px] leading-8 font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
          Karty k výkupu
        </h2>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {items.map(({ item, name, localId, set, setCode }) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3">
              <span className="flex min-w-0 flex-[1_1_220px] flex-col">
                <strong className="text-[15px]">{name}</strong>
                <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                  {set} · <span style={{ fontFamily: "var(--font-mono)" }}>{[setCode, localId].filter(Boolean).join(" ")}</span>
                </span>
              </span>
              <ConditionBadge condition={item.declaredCondition} />
              <span className="pl-lang">{item.language}</span>
              <span className="text-sm">{item.quantity} ks</span>
              <strong className="min-w-[90px] text-right">{item.estimateHal ? formatCzk(item.estimateHal) : "bulk"}</strong>
            </li>
          ))}
        </ul>
        {req.bulkCount > 0 && <p className="pl-note m-0">{req.bulkCount} ks posoudíme jako bulk, cenu za ně doplníme po kontrole.</p>}
      </section>

      <p className="m-0 text-[15px]">
        Máš dotaz? Napiš na <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a> a uveď číslo výkupu. <Link href="/karty">Zpátky do obchodu</Link>
      </p>
    </main>
  );
}
