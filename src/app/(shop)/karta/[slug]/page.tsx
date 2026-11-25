import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { WatchForm } from "@/components/watch-form";
import { CardZoom } from "@/components/card-zoom";
import { OfferTile } from "@/components/offer-tile";
import { ConditionBadge } from "@/components/ui";
import { getCard } from "@/lib/catalog";
import { buybackCardFor } from "@/lib/buyback";
import { estimateItem } from "@/lib/buyback-shared";
import { tk } from "@/i18n/core";
import { getT } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/karta/[slug]">): Promise<Metadata> {
  const card = await getCard(decodeURIComponent((await params).slug));
  const t = await getT();
  if (!card) return { title: t("Karta nenalezena") };
  const v = card.variants[0];
  return {
    title: `${v.name} ${v.number} (${v.set})`,
    description: t("{name}, {set} {number}, {rarity}. Od {price}.", { name: v.name, set: v.set, number: v.number, rarity: v.rarity, price: t.price(Math.min(...card.variants.map((x) => x.priceHal))) }),
  };
}

export default async function KartaPage({ params, searchParams }: PageProps<"/karta/[slug]">) {
  const slug = decodeURIComponent((await params).slug);
  const card = await getCard(slug);
  if (!card) notFound();
  const t = await getT();

  const sp = await searchParams;
  const wanted = typeof sp.kus === "string" ? sp.kus : undefined;
  const variants = [...card.variants].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || b.priceHal - a.priceHal);
  const selected = variants.find((v) => v.id === wanted) ?? variants.find((v) => v.stock > 0) ?? variants[0];
  const out = selected.stock <= 0;
  // odhad výkupu stejným výpočtem jako formulář výkupu (Cardmarket low, Near Mint, EN)
  const bbCard = await buybackCardFor(slug);
  const estimate = bbCard ? estimateItem(bbCard, { condition: "NM", language: "EN", quantity: 1 }, "cash") : null;
  const setHref = `/karty?edice=${encodeURIComponent(selected.set)}`;

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-6 pb-14 sm:px-6">
      <nav aria-label={t("Drobečková navigace")} className="flex flex-wrap gap-2 text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
        <Link href="/" style={{ color: "var(--ink-muted)" }}>
          {t("Domů")}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/karty" style={{ color: "var(--ink-muted)" }}>
          {t("Karty")}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={setHref} style={{ color: "var(--ink-muted)" }}>
          {selected.set}
        </Link>
        <span aria-hidden="true">/</span>
        <span>{selected.name}</span>
      </nav>

      <div className="flex flex-wrap items-start gap-6 sm:gap-10">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3 md:max-w-[460px]">
          <div className="flex justify-center rounded-[10px] p-6 sm:p-8" style={{ background: "var(--surface-200)" }}>
            {selected.image ? (
              <div className="pl-holo-card w-full max-w-[360px]" style={{ position: "relative" }}>
                <CardZoom src={selected.image} alt={`${selected.name}, ${selected.set} ${selected.number}`} />
              </div>
            ) : (
              <div className="pl-tile__ph w-full max-w-[360px]" role="img" aria-label={t("Obrázek karty chybí")} />
            )}
          </div>
          <p className="pl-note m-0">{t("Na fotce je konkrétní kus, který ti pošleme. U levnějších karet může jít o ilustrační foto.")}</p>
        </div>

        <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[38px] leading-[40px] font-extrabold sm:text-[48px] sm:leading-[48px]" style={{ fontFamily: "var(--font-display)" }}>
              {selected.name}
            </h1>
            <p className="m-0 text-[15px] leading-[22px]" style={{ color: "var(--ink-muted)" }}>
              <Link href={setHref} style={{ color: "var(--ink-muted)" }}>
                {selected.set}
              </Link>{" "}
              · <span style={{ fontFamily: "var(--font-mono)" }}>{[selected.setCode, selected.number].filter(Boolean).join(" ")}</span>
              {selected.rarity && ` · ${selected.rarity}`}
            </p>
          </div>

          <section aria-labelledby="kus-h" className="flex flex-col gap-2">
            <h2 id="kus-h" className="m-0 mb-1 text-base font-bold">
              {variants.length > 1 ? t("Vyber si kus") : t("Kus skladem")}
            </h2>
            {variants.map((v) => {
              const current = v.id === selected.id;
              return (
                <Link
                  key={v.id}
                  href={`/karta/${encodeURIComponent(slug)}?kus=${encodeURIComponent(v.id)}`}
                  replace
                  scroll={false}
                  aria-current={current ? "true" : undefined}
                  className={`pl-variant${v.stock <= 0 ? " pl-variant--out" : ""}`}
                >
                  <span className="pl-variant__radio" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
                    <ConditionBadge condition={v.condition} long />
                    <span className="pl-lang">{v.lang}</span>
                    {v.finish && <span className="text-sm" style={{ color: "var(--ink-muted)" }}>{v.finish}</span>}
                    <span
                      className="basis-full text-[13px] font-semibold sm:ml-auto sm:basis-auto"
                      style={{ color: v.stock > 0 ? "var(--ink-muted)" : "var(--red-text)" }}
                    >
                      {v.stock > 0 ? t("Skladem {n} ks", { n: v.stock }) : t("Vyprodáno")}
                    </span>
                  </span>
                  <strong className="text-right text-lg leading-6 whitespace-nowrap sm:min-w-24">{t.price(v.priceHal)}</strong>
                </Link>
              );
            })}
          </section>

          <div className="flex flex-wrap items-end gap-3">
            {out ? (
              <WatchForm cardId={selected.cardSlug} mode="stock" defaultOpen={sp.hlidat === "1"} primary />
            ) : (
              <>
                <div className="min-w-0 flex-[1_1_320px]">
                  <AddToCart offerId={selected.id} quantity max={selected.stock} block label={`${t("Do košíku")} · ${t.price(selected.priceHal)}`} />
                </div>
                <WatchForm cardId={selected.cardSlug} mode="price" currentHal={Math.min(...variants.filter((v) => v.stock > 0).map((v) => v.priceHal))} defaultOpen={sp.hlidat === "1"} />
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {([
              [tk("Bezpečné balení"), tk("Obal, toploader a pevná obálka.")],
              [tk("Jak hodnotíme stav"), null],
              [tk("Doprava"), tk("Zásilkovna, Česká pošta, osobní odběr.")],
            ] as [string, string | null][]).map(([title, d]) => (
              <div key={title} className="flex flex-col gap-1 rounded-[10px] px-4 py-3.5" style={{ border: "1px solid var(--line)" }}>
                <strong className="text-sm">{t(title)}</strong>
                {d ? (
                  <span className="text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
                    {t(d)}
                  </span>
                ) : (
                  <Link href="/stav-karet" className="text-[13px] leading-[18px]">
                    {t("Průvodce stavem karet")}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {estimate && !estimate.rejected && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] px-5 py-4"
              style={{ background: "var(--band-bg)", color: "var(--band-ink)", border: "2px solid var(--band-border)" }}
            >
              <span className="text-[15px] leading-[22px]">
                {t("Máš tuhle kartu doma?")}{" "}
                {estimate.bulkOnly ? (
                  t("Vezmeme ji v rámci hromadného výkupu.")
                ) : (
                  <>
                    {t("Vykoupíme ji, nezávazný odhad v Near Mint")} <strong>{t.price(estimate.unitHal)}</strong>.
                  </>
                )}
              </span>
              <Link
                href={`/vykup?karta=${encodeURIComponent(slug)}`}
                className="pl-lift rounded-[10px] px-4 py-2.5 text-sm font-bold no-underline"
                style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)" }}
              >
                {t("Prodat kartu")}
              </Link>
            </div>
          )}
        </div>
      </div>

      {card.more.length > 0 && (
        <section aria-labelledby="more-h" className="mt-4 flex flex-col gap-4">
          <h2 id="more-h" className="m-0 text-[28px] leading-8 font-extrabold sm:text-[32px] sm:leading-9" style={{ fontFamily: "var(--font-display)" }}>
            {t("Mohlo by se ti líbit")}
          </h2>
          <div className="pl-grid grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5">
            {card.more.map((o) => (
              <OfferTile key={o.id} o={o} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
