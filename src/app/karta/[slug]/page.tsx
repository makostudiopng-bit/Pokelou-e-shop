import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { OfferTile } from "@/components/offer-tile";
import { Button, ConditionBadge } from "@/components/ui";
import { getCard } from "@/lib/catalog";
import { buybackLine, DEFAULT_RULES, eurToHal, formatCzk } from "@/lib/pricing";

// Orientační kurz pro odhad výkupu, dokud nemáme denní kurz z databáze.
const FALLBACK_EUR_CZK = 24.3;

export async function generateMetadata({ params }: PageProps<"/karta/[slug]">): Promise<Metadata> {
  const card = await getCard(decodeURIComponent((await params).slug));
  if (!card) return { title: "Karta nenalezena" };
  const v = card.variants[0];
  return {
    title: `${v.name} ${v.number} (${v.set})`,
    description: `${v.name}, ${v.set} ${v.number}, ${v.rarity}. Od ${formatCzk(Math.min(...card.variants.map((x) => x.priceHal)))}.`,
  };
}

export default async function KartaPage({ params, searchParams }: PageProps<"/karta/[slug]">) {
  const slug = decodeURIComponent((await params).slug);
  const card = await getCard(slug);
  if (!card) notFound();

  const sp = await searchParams;
  const wanted = typeof sp.kus === "string" ? sp.kus : undefined;
  const variants = [...card.variants].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || b.priceHal - a.priceHal);
  const selected = variants.find((v) => v.id === wanted) ?? variants.find((v) => v.stock > 0) ?? variants[0];
  const out = selected.stock <= 0;
  const trend = variants.find((v) => v.trendEur != null)?.trendEur;
  const estimate =
    trend != null
      ? buybackLine({
          trendHal: eurToHal(trend, FALLBACK_EUR_CZK),
          condition: "NM",
          language: "EN",
          quantity: 1,
          payout: "cash",
          rules: DEFAULT_RULES,
        })
      : null;
  const setHref = `/karty?edice=${encodeURIComponent(selected.set)}`;

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-6 pb-14 sm:px-6">
      <nav aria-label="Drobečková navigace" className="flex flex-wrap gap-2 text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
        <Link href="/" style={{ color: "var(--ink-muted)" }}>
          Domů
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/karty" style={{ color: "var(--ink-muted)" }}>
          Karty
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
                <Image
                  src={selected.image}
                  alt={`${selected.name}, ${selected.set} ${selected.number}`}
                  width={630}
                  height={880}
                  sizes="(max-width: 640px) 80vw, 360px"
                  priority
                  className="h-auto w-full"
                />
              </div>
            ) : (
              <div className="pl-tile__ph w-full max-w-[360px]" role="img" aria-label="Obrázek karty chybí" />
            )}
          </div>
          <p className="pl-note m-0">Na fotce je konkrétní kus, který ti pošleme. U levnějších karet může jít o ilustrační foto.</p>
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

          {trend != null && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] px-4 py-3 text-sm" style={{ background: "var(--surface-200)" }}>
              <span style={{ color: "var(--ink-muted)" }}>Orientační tržní cena</span>
              <strong>{trend.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
              <span style={{ color: "var(--ink-muted)" }}>· trend Cardmarketu, aktualizováno denně</span>
            </div>
          )}

          <section aria-labelledby="kus-h" className="flex flex-col gap-2">
            <h2 id="kus-h" className="m-0 mb-1 text-base font-bold">
              {variants.length > 1 ? "Vyber si kus" : "Kus skladem"}
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
                      style={{ color: v.stock > 0 ? "var(--ink-muted)" : "var(--brand-red)" }}
                    >
                      {v.stock > 0 ? `Skladem ${v.stock} ks` : "Vyprodáno"}
                    </span>
                  </span>
                  <strong className="text-right text-lg leading-6 whitespace-nowrap sm:min-w-24">{formatCzk(v.priceHal)}</strong>
                </Link>
              );
            })}
          </section>

          <div className="flex flex-wrap items-end gap-3">
            {out ? (
              <>
                <Button variant="primary" className="flex-[1_1_220px]" block>
                  Hlídat, až bude skladem
                </Button>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-[1_1_320px]">
                  <AddToCart offerId={selected.id} quantity max={selected.stock} block label={`Do košíku · ${formatCzk(selected.priceHal)}`} />
                </div>
                <Button variant="secondary">Hlídat cenu</Button>
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Bezpečné balení", "Obal, toploader a pevná obálka."],
              ["Jak hodnotíme stav", null],
              ["Doprava", "Zásilkovna, Česká pošta, osobní odběr."],
            ].map(([t, d]) => (
              <div key={t} className="flex flex-col gap-1 rounded-[10px] px-4 py-3.5" style={{ border: "1px solid var(--line)" }}>
                <strong className="text-sm">{t}</strong>
                {d ? (
                  <span className="text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
                    {d}
                  </span>
                ) : (
                  <Link href="/stav-karet" className="text-[13px] leading-[18px]">
                    Průvodce stavem karet
                  </Link>
                )}
              </div>
            ))}
          </div>

          {estimate && !estimate.rejected && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] px-5 py-4"
              style={{ background: "var(--surface-inverse)", color: "var(--ink-inverse)" }}
            >
              <span className="text-[15px] leading-[22px]">
                Máš tuhle kartu doma?{" "}
                {estimate.bulkOnly ? (
                  "Vezmeme ji v rámci hromadného výkupu."
                ) : (
                  <>
                    Vykoupíme ji, odhad v Near Mint <strong>{formatCzk(estimate.unitHal)}</strong>.
                  </>
                )}
              </span>
              <Link
                href="/vykup"
                className="pl-lift rounded-[10px] px-4 py-2.5 text-sm font-bold no-underline"
                style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)" }}
              >
                Prodat kartu
              </Link>
            </div>
          )}
        </div>
      </div>

      {card.more.length > 0 && (
        <section aria-labelledby="more-h" className="mt-4 flex flex-col gap-4">
          <h2 id="more-h" className="m-0 text-[28px] leading-8 font-extrabold sm:text-[32px] sm:leading-9" style={{ fontFamily: "var(--font-display)" }}>
            Mohlo by se ti líbit
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
