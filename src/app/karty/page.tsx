import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { AutoSubmit } from "@/components/auto-submit";
import { OfferTile } from "@/components/offer-tile";
import { ConditionBadge } from "@/components/ui";
import { getOffers } from "@/lib/catalog";
import { applyQuery, facets, parseQuery, SORTS, toSearch, type CatalogQuery } from "@/lib/catalog-query";

export const metadata: Metadata = {
  title: "Karty",
  description: "Pokémon single karty skladem: filtruj podle edice, stavu, jazyka a ceny.",
};

const FORM = "filtry";

function plural(n: number, one: string, few: string, many: string) {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}

function activeChips(q: CatalogQuery) {
  const chips: { label: string; href: string }[] = [];
  const href = (patch: Partial<CatalogQuery>) => `/karty${toSearch(q, patch)}`;
  if (q.q) chips.push({ label: `„${q.q}“`, href: href({ q: "" }) });
  for (const s of q.sets) chips.push({ label: s, href: href({ sets: q.sets.filter((x) => x !== s) }) });
  if (q.conditions.length) chips.push({ label: q.conditions.join(", "), href: href({ conditions: [] }) });
  for (const l of q.langs) chips.push({ label: l, href: href({ langs: q.langs.filter((x) => x !== l) }) });
  for (const f of q.finishes) chips.push({ label: f, href: href({ finishes: q.finishes.filter((x) => x !== f) }) });
  if (q.min != null || q.max != null)
    chips.push({ label: `${q.min ?? 0}–${q.max ?? "∞"} Kč`, href: href({ min: undefined, max: undefined }) });
  if (q.soldOut) chips.push({ label: "i vyprodané", href: href({ soldOut: false }) });
  return chips;
}

export default async function KartyPage({ searchParams }: PageProps<"/karty">) {
  const q = parseQuery(await searchParams);
  const { offers, demo } = await getOffers();
  const f = facets(offers);
  const res = applyQuery(offers, q);
  const inStock = offers.filter((o) => o.stock > 0).length;
  const chips = activeChips(q);
  const title = q.sets.length === 1 ? q.sets[0] : q.q ? `Hledáš „${q.q}“` : "Všechny karty";

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 pt-6 pb-14 sm:px-6">
      <nav aria-label="Drobečková navigace" className="flex gap-2 text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
        <Link href="/" style={{ color: "var(--ink-muted)" }}>
          Domů
        </Link>
        <span aria-hidden="true">/</span>
        <span>Karty</span>
      </nav>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="m-0 text-[34px] leading-[38px] font-extrabold sm:text-[40px] sm:leading-[40px]" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h1>
        <span className="text-[15px]" style={{ color: "var(--ink-muted)" }}>
          {inStock} {plural(inStock, "karta", "karty", "karet")} skladem
        </span>
      </div>
      {demo && (
        <p className="pl-note m-0">Ukázková nabídka z fotek klienta – skutečný sklad se ukáže po napojení databáze.</p>
      )}

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <Form id={FORM} action="/karty" className="contents">
          {q.q && <input type="hidden" name="q" value={q.q} />}
          <details className="pl-filters md:w-[260px] md:flex-none">
            <summary>Filtry{chips.length > 0 && ` (${chips.length})`}</summary>
            <div className="pl-filters__body">
              <label className="pl-check font-bold" style={{ fontSize: 15 }}>
                <input type="checkbox" name="vyprodane" value="1" defaultChecked={q.soldOut} />
                Zobrazit i vyprodané
              </label>

              <fieldset className="pl-fs">
                <legend>Stav</legend>
                {f.conditions.map(([c, n]) => (
                  <label key={c} className="pl-check">
                    <input type="checkbox" name="stav" value={c} defaultChecked={q.conditions.includes(c)} />
                    <ConditionBadge condition={c} long />
                    <span className="pl-check__n">{n}</span>
                  </label>
                ))}
                <Link href="/stav-karet" className="text-[13px] font-bold">
                  Jak hodnotíme stav?
                </Link>
              </fieldset>

              <fieldset className="pl-fs">
                <legend>Jazyk</legend>
                <div className="pl-pills">
                  {f.langs.map(([l]) => (
                    <label key={l} className="pl-pill">
                      <input type="checkbox" name="jazyk" value={l} defaultChecked={q.langs.includes(l)} />
                      {l}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="pl-fs">
                <legend>Edice</legend>
                {f.sets.map(([s, n]) => (
                  <label key={s} className="pl-check">
                    <input type="checkbox" name="edice" value={s} defaultChecked={q.sets.some((x) => x.toLowerCase() === s.toLowerCase())} />
                    {s}
                    <span className="pl-check__n">{n}</span>
                  </label>
                ))}
              </fieldset>

              {f.finishes.length > 1 && (
                <fieldset className="pl-fs">
                  <legend>Provedení</legend>
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
                <legend>Cena</legend>
                <div className="flex gap-3">
                  {(
                    [
                      ["od", "od", q.min, "0"],
                      ["do", "do", q.max, "10 000"],
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
                        <span className="pl-field__suffix">Kč</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button type="submit" className="pl-btn pl-btn--primary pl-btn--block">
                Použít filtry
              </button>
            </div>
          </details>
        </Form>
        <AutoSubmit formId={FORM} />

        <section aria-label="Karty" className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <Link key={c.label} href={c.href} className="pl-chip" aria-label={`Zrušit filtr ${c.label}`}>
                  {c.label}
                  <span className="pl-chip__x" aria-hidden="true">
                    ×
                  </span>
                </Link>
              ))}
              {chips.length > 1 && (
                <Link href="/karty" className="px-1 py-1.5 text-[13px] font-bold">
                  Zrušit vše
                </Link>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              Řadit
              <select form={FORM} name="razeni" defaultValue={q.sort} className="pl-select">
                {Object.entries(SORTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
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
              <strong className="text-lg">Tady nic není</strong>
              <p className="m-0 text-[15px]" style={{ color: "var(--ink-muted)" }}>
                Zkus ubrat filtry, nebo nám napiš – kartu ti rádi seženeme.
              </p>
              <Link href="/karty" className="pl-btn pl-btn--secondary no-underline">
                Zrušit filtry
              </Link>
            </div>
          )}

          {res.pages > 1 && (
            <nav aria-label="Stránkování" className="pl-pager">
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
                  Další
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
