import Image from "next/image";
import Link from "next/link";
import { cartCount as cartCount_ } from "@/lib/cart-server";

const STRIP = [
  "Karty posíláme v obalu a toploaderu",
  "Výkup za peníze i kredit do e-shopu",
  "Nové karty každý týden",
  "Platba kartou, převodem i dobírkou",
];

function StripItems({ hidden }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden || undefined} className="flex gap-10 whitespace-nowrap pr-10">
      {STRIP.map((t) => (
        <span key={t} className="flex gap-10">
          <span>{t}</span>
          <span style={{ color: "var(--brand-yellow)" }}>✦</span>
        </span>
      ))}
    </div>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h3l2.7 12.3a2 2 0 0 0 2 1.7h7.6a2 2 0 0 0 2-1.6L21 7H6" />
    </svg>
  );
}

export async function SiteHeader() {
  const cartCount = await cartCount_();
  return (
    <>
      <div
        className="overflow-hidden py-2 text-sm font-bold"
        style={{ background: "var(--on-yellow)", color: "#f4eee6", borderBottom: "3px solid var(--brand-yellow)" }}
      >
        <div className="pl-marquee">
          <StripItems />
          <StripItems hidden />
        </div>
      </div>
      <header style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-000)" }}>
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-8 gap-y-4 px-4 py-3 sm:px-6">
          <Link href="/" className="pl-wiggle-hover block flex-none" aria-label="PokeLou – domů">
            <Image src="/brand/logo.png" alt="PokeLou" width={88} height={88} priority className="h-16 w-16 sm:h-[88px] sm:w-[88px]" />
          </Link>
          <form role="search" action="/karty" className="order-last flex min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-80">
            <label htmlFor="q" className="sr-only">
              Hledat kartu
            </label>
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Jakou kartu hledáš? (např. Gardevoir 245/198)"
              className="min-w-0 flex-1 rounded-l-full border-2 border-r-0 px-5 py-2.5 text-[15px] font-medium"
              style={{ borderColor: "var(--ink)", background: "var(--surface-100)", color: "var(--ink)" }}
            />
            <button
              type="submit"
              aria-label="Hledat"
              className="grid w-14 flex-none cursor-pointer place-items-center rounded-r-full border-2"
              style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)", borderColor: "var(--ink)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
          </form>
          <nav aria-label="Hlavní" className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-[15px] font-extrabold sm:ml-0">
            <Link href="/karty" className="py-2.5 no-underline">
              Karty
            </Link>
            <Link href="/karty" className="hidden py-2.5 no-underline sm:inline">
              Edice
            </Link>
            <Link href="/vykup" className="py-2.5 no-underline">
              Výkup
            </Link>
            <Link
              href="/kosik"
              className="pl-lift flex items-center gap-2 rounded-full border-2 px-4 py-2 no-underline"
              style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)", borderColor: "var(--ink)" }}
              aria-label={cartCount > 0 ? `Košík, ${cartCount} ${cartCount === 1 ? "kus" : cartCount < 5 ? "kusy" : "kusů"}` : "Košík je prázdný"}
            >
              <CartIcon />
              Košík
              {cartCount > 0 && (
                <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full text-xs" style={{ background: "var(--brand-red)", color: "#fff" }}>
                  {cartCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
