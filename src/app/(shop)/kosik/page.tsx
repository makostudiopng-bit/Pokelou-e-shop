import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Steps } from "@/components/steps";
import { ConditionBadge } from "@/components/ui";
import { getCartView } from "@/lib/cart-server";
import { formatCzk } from "@/lib/pricing";
import { removeFromCartAction, updateQtyAction } from "./actions";

export const metadata: Metadata = {
  title: "Košík",
  robots: { index: false },
};

function pcs(n: number) {
  return `${n} ${n === 1 ? "kus" : n < 5 ? "kusy" : "kusů"}`;
}

export default async function KosikPage() {
  const cart = await getCartView();
  const empty = cart.lines.length === 0;

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-8 pb-16 sm:px-6">
      <Steps current={0} />

      <h1 className="m-0 text-[40px] leading-[40px] font-extrabold sm:text-[48px] sm:leading-[48px]" style={{ fontFamily: "var(--font-display)" }}>
        Tvůj košík
      </h1>

      {cart.removed.length > 0 && (
        <p role="status" className="m-0 rounded-[10px] px-4 py-3 text-[15px]" style={{ background: "var(--surface-200)" }}>
          {cart.removed.length === 1 ? "Jedna karta" : `${cart.removed.length} karty`} z košíku se mezitím prodala, takže v souhrnu už
          nejsou.
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Položky v košíku" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
          {cart.lines.map(({ id, qty, offer: o, lineHal, adjusted }) => {
            const href = `/karta/${encodeURIComponent(o.cardSlug)}?kus=${encodeURIComponent(o.id)}`;
            return (
              <article
                key={id}
                className="flex flex-wrap items-center gap-x-5 gap-y-4 rounded-[14px] p-4"
                style={{ background: "var(--surface-100)", border: "2px solid var(--line)" }}
              >
                <Link href={href} className="pl-lift block w-[72px] flex-none rounded-[5px]" aria-label={`Detail karty ${o.name}`}>
                  {o.image ? (
                    <Image src={o.image} alt="" width={630} height={880} sizes="72px" className="h-auto w-full rounded-[5px]" />
                  ) : (
                    <div className="pl-tile__ph" />
                  )}
                </Link>
                <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
                  <Link href={href} className="text-[17px] leading-[22px] font-extrabold no-underline">
                    {o.name}
                  </Link>
                  <span className="text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
                    {o.set} · <span style={{ fontFamily: "var(--font-mono)" }}>{o.number}</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ConditionBadge condition={o.condition} long />
                    <span className="pl-lang">{o.lang}</span>
                    {o.finish && <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>{o.finish}</span>}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <form action={updateQtyAction} className="flex items-center rounded-full" style={{ border: "2px solid var(--ink)", background: "var(--surface-100)" }}>
                    <input type="hidden" name="kus" value={id} />
                    <button type="submit" name="pocet" value={qty - 1} aria-label={`Ubrat kus: ${o.name}`} className="h-10 w-10 cursor-pointer text-lg font-extrabold">
                      −
                    </button>
                    <span className="min-w-6 text-center font-extrabold" aria-label={`Počet: ${qty}`}>
                      {qty}
                    </span>
                    <button
                      type="submit"
                      name="pocet"
                      value={qty + 1}
                      disabled={qty >= o.stock}
                      aria-label={`Přidat kus: ${o.name}`}
                      className="h-10 w-10 cursor-pointer text-lg font-extrabold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </form>
                  <span className="text-xs" style={{ color: adjusted ? "var(--brand-red)" : "var(--ink-muted)" }}>
                    {adjusted ? `Zbývá jen ${o.stock} ks` : `Skladem ${o.stock} ks`}
                  </span>
                </div>

                <div className="flex min-w-[110px] flex-col text-right">
                  <strong className="text-xl leading-6 font-extrabold">{formatCzk(lineHal)}</strong>
                  {qty > 1 && (
                    <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {formatCzk(o.priceHal)} / ks
                    </span>
                  )}
                </div>

                <form action={removeFromCartAction}>
                  <input type="hidden" name="kus" value={id} />
                  <button
                    type="submit"
                    aria-label={`Odebrat ${o.name} z košíku`}
                    className="pl-wiggle-hover grid h-10 w-10 cursor-pointer place-items-center"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                    </svg>
                  </button>
                </form>
              </article>
            );
          })}

          {empty && (
            <div className="pl-empty">
              <strong className="text-[32px] leading-9" style={{ fontFamily: "var(--font-display)" }}>
                Košík je prázdný
              </strong>
              <span className="text-[15px]" style={{ color: "var(--ink-muted)" }}>
                Žádná karta? To se dá rychle napravit.
              </span>
              <Link href="/karty" className="pl-btn pl-btn--primary no-underline">
                Jít vybírat karty
              </Link>
            </div>
          )}

          {!empty && (
            <Link href="/karty" className="self-start py-2 text-[15px] font-extrabold">
              ← Pokračovat v nákupu
            </Link>
          )}
        </section>

        {!empty && (
          <aside
            aria-label="Souhrn objednávky"
            className="flex min-w-0 max-w-[420px] flex-[1_1_340px] flex-col gap-4 rounded-2xl p-[22px]"
            style={{ background: "var(--surface-100)", border: "2px solid var(--ink)", boxShadow: "var(--shadow-sticker)" }}
          >
            <h2 className="m-0 text-[30px] leading-8 font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
              Souhrn
            </h2>
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2.5 text-[15px] leading-[22px]">
              <dt style={{ color: "var(--ink-muted)" }}>Karty ({pcs(cart.count)})</dt>
              <dd className="m-0 text-right font-bold">{formatCzk(cart.subtotalHal)}</dd>
              <dt style={{ color: "var(--ink-muted)" }}>Doprava</dt>
              <dd className="m-0 text-right" style={{ color: "var(--ink-muted)" }}>
                v dalším kroku
              </dd>
            </dl>
            <div
              className="flex items-baseline justify-between gap-3 rounded-xl px-4 py-3.5"
              style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)", border: "2px solid var(--ink)" }}
            >
              <span className="text-[15px] font-extrabold">Celkem</span>
              <strong className="text-[40px] leading-10" style={{ fontFamily: "var(--font-display)" }}>
                {formatCzk(cart.subtotalHal)}
              </strong>
            </div>
            <Link href="/pokladna" className="pl-btn pl-btn--primary pl-btn--block no-underline">
              Pokračovat k dopravě a platbě
            </Link>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
              <li>Každou kartu balíme do obalu a toploaderu.</li>
              <li>Platba kartou, převodem s QR kódem nebo dobírkou.</li>
              <li>Na vrácení máš 14 dní.</li>
            </ul>
          </aside>
        )}
      </div>
    </main>
  );
}
