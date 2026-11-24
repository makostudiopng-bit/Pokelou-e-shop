import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { AutoSubmit } from "@/components/auto-submit";
import { OfferTile } from "@/components/offer-tile";
import { ConditionBadge } from "@/components/ui";
import { getOffers } from "@/lib/catalog";
import { SetFilter } from "@/components/set-filter";
import { applyQuery, facets, isNew, NEW_DAYS, parseQuery, SORTS, toSearch, type CatalogQuery } from "@/lib/catalog-query";
import type { T } from "@/i18n/core";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Karty"),
    description: t("Pokémon single karty skladem: filtruj podle edice, stavu, jazyka a ceny."),
  };
}

const FORM = "filtry";

function activeChips(q: CatalogQuery, t: T) {
  const chips: { label: string; href: string }[] = [];
  const href = (patch: Partial<CatalogQuery>) => `/karty${toSearch(q, patch)}`;
  if (q.q) chips.push({ label: `„${q.q}“`, href: href({ q: "" }) });
  for (const s of q.sets) chips.push({ label: s, href: href({ sets: q.sets.filter((x) => x !== s) }) });
  if (q.conditions.length) chips.push({ label: q.conditions.join(", "), href: href({ conditions: [] }) });
  for (const l of q.langs) chips.push({ label: l, href: href({ langs: q.langs.filter((x) => x !== l) }) });
  for (const f of q.finishes) chips.push({ label: f, href: href({ finishes: q.finishes.filter((x) => x !== f) }) });
  if (q.min != null || q.max != null)
    chips.push({ label: `${q.min ?? 0}–${q.max ?? "∞"} ${t("Kč")}`, href: href({ min: undefined, max: undefined }) });
  if (q.fresh) chips.push({ label: t("nově naskladněné"), href: href({ fresh: false }) });
  if (q.soldOut) chips.push({ label: t("i vyprodané"), href: href({ soldOut: false }) });
  return chips;
}

export default async function KartyPage({ searchParams }: PageProps<"/karty">) {
  const q = parseQuery(await searchParams);
  const t = await getT();
  const { offers, demo } = await getOffers();
  const f = facets(offers);
  const res = applyQuery(offers, q);
  const inStock = offers.filter((o) => o.stock > 0).length;
  const freshCount = offers.filter((o) => o.stock > 0 && isNew(o)).length;
  const chips = activeChips(q, t);
  const title = q.sets.length === 1 ? q.sets[0] : q.q ? t("Hledáš „{q}“", { q: q.q }) : q.fresh ? t("Nově naskladněno") : t("Všechny karty");

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 pt-6 pb-14 sm:px-6">
      <nav aria-label={t("Drobečková navigace")} className="flex gap-2 text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
        <Link href="/" style={{ color: "var(--ink-muted)" }}>
          {t("Domů")}
        </Link>
        <span aria-hidden="true">/</span>
        <span>{t("Karty")}</span>
      </nav>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="m-0 text-[34px] leading-[38px] font-extrabold sm:text-[40px] sm:leading-[40px]" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h1>
        <span className="text-[15px]" style={{ color: "var(--ink-muted)" }}>
          {t.p(inStock, "{n} karta skladem|{n} karty skladem|{n} karet skladem")}
        </span>
      </div>
      {demo && (
        <p className="pl-note m-0">{t("Ukázková nabídka z fotek klienta – skutečný sklad se ukáže po napojení databáze.")}</p>
      )}

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <Form id={FORM} action="/karty" className="contents">
          {q.q && <input type="hidden" name="q" value={q.q} />}
          <details className="pl-filters md:w-[260px] md:flex-none">
            <summary>{t("Filtry")}{chips.length > 0 && ` (${chips.length})`}</summary>
            {/* key: po změně adresy (např. „Zrušit vše“) se pole znovu vytvoří podle URL, jinak by zůstala zaškrtnutá */}
            <div key={toSearch(q, { page: 1 })} className="pl-filters__body">
              <div className="flex flex-col gap-2.5">
                <label className="pl-check pl-check--hot font-bold" style={{ fontSize: 15 }}>
                  <input type="checkbox" name="novinky" value="1" defaultChecked={q.fresh} />
                  <span>{t("Nově naskladněno")}</span>
                  <span className="pl-check__n" title={t("za posledních {n} dní", { n: NEW_DAYS })}>{freshCount}</span>
                </label>
                <label className="pl-check font-bold" style={{ fontSize: 15 }}>
                  <input type="checkbox" name="vyprodane" value="1" defaultChecked={q.soldOut} />
                  {t("Zobrazit i vyprodané")}
                </label>
              </div>

              <fieldset className="pl-fs">
                <legend>{t("Stav")}</legend>
                {f.conditions.map(([c, n]) => (
                  <label key={c} className="pl-check">
                    <input type="checkbox" name="stav" value={c} defaultChecked={q.conditions.includes(c)} />
                    <ConditionBadge condition={c} long />
                    <span className="pl-check__n">{n}</span>
                  </label>
                ))}
                <Link href="/stav-karet" className="text-[13px] font-bold">
                  {t("Jak hodnotíme stav?")}
                </Link>
              </fieldset>

              <fieldset className="pl-fs">
                <legend>{t("Jazyk")}</legend>
                <div className="pl-pills">
                  {f.langs.map(([l]) => (
                    <label key={l} className="pl-pill">
                      <input type="checkbox" name="jazyk" value={l} defaultChecked={q.langs.includes(l)} />
                      {l}
                    </label>
                  ))}
                </div>
              </fieldset>

              <SetFilter sets={f.sets} selected={q.sets} />

              {f.finishes.length > 1 && (
                <fieldset className="pl-fs">
                  <legend>{t("Provedení")}</legend>
                  {f.finishes.map(([x, n]) => (
                    <label key={x} className="pl-check">
                      <input type="checkbox" name="provedeni" value={x} defaultChecked={q.finishes.includes(x)} />
                      {x}
                      <span className="pl-check__n">{n}</span>
                    </label>
                  ))}
                </fieldset>
              )}

              <fieldset className="pl-fs">
                <legend>{t("Cena")}</legend>
                <div className="flex gap-3">
                  {(
                    [
                      ["od", t("od"), q.min, "0"],
                      ["do", t("do"), q.max, "10 000"],
                    ] as const
                  ).map(([name, label, v, ph]) => (
                    <label key={name} className="pl-field min-w-0 flex-1">
                      <span className="pl-field__label">{label}</span>
                      <span className="pl-field__wrap">
                        <input
                          className="pl-field__input w-full pr-9"
                          name={name}
                          inputMode="numeric"
                          pattern="[0-9 ]*"
                          placeholder={ph}
                          defaultValue={v ?? ""}
                        />
                        <span className="pl-field__suffix">{t("Kč")}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button type="submit" className="pl-btn pl-btn--primary pl-btn--block">
                {t("Použít filtry")}
              </button>
            </div>
          </details>
        </Form>
        <AutoSubmit formId={FORM} />

        <section aria-label={t("Karty")} className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <Link key={c.label} href={c.href} className="pl-chip" aria-label={t("Zrušit filtr {label}", { label: c.label })}>
                  {c.label}
                  <span className="pl-chip__x" aria-hidden="true">
                    ×
                  </span>
                </Link>
              ))}
              {chips.length > 1 && (
                <Link href="/karty" className="px-1 py-1.5 text-[13px] font-bold">
                  {t("Zrušit vše")}
                </Link>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              {t("Řadit")}
              <select form={FORM} name="razeni" defaultValue={q.sort} className="pl-select">
                {Object.entries(SORTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {t(v)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {res.items.length > 0 ? (
            <div className="pl-grid grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5">
              {res.items.map((o, i) => (
                <OfferTile key={o.id} o={o} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="pl-empty">
              <strong className="text-lg">{t("Tady nic není")}</strong>
              <p className="m-0 text-[15px]" style={{ color: "var(--ink-muted)" }}>
                {t("Zkus ubrat filtry, nebo nám napiš – kartu ti rádi seženeme.")}
              </p>
              <Link href="/karty" className="pl-btn pl-btn--secondary no-underline">
                {t("Zrušit filtry")}
              </Link>
            </div>
          )}

          {res.pages > 1 && (
            <nav aria-label={t("Stránkování")} className="pl-pager">
              {Array.from({ length: res.pages }, (_, i) => i + 1).map((p) =>
                p === res.page ? (
                  <span key={p} aria-current="page">
                    {p}
                  </span>
                ) : (
                  <Link key={p} href={`/karty${toSearch(q, { page: p })}`}>
                    {p}
                  </Link>
                ),
              )}
              {res.page < res.pages && (
                <Link className="pl-lift" href={`/karty${toSearch(q, { page: res.page + 1 })}`}>
                  {t("Další")}
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
