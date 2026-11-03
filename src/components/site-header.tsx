import Image from "next/image";
import Link from "next/link";
import { cartCount as cartCount_ } from "@/lib/cart-server";
import { SHOP } from "@/config/shop";
import { InstagramIcon } from "./instagram-icon";
import { Marquee } from "./marquee";
import { ThemeToggle } from "./theme-toggle";
import { SearchBox } from "./search-box";

const STRIP = [
  "Karty posíláme v obalu a toploaderu",
  "Výkup za peníze i kredit do e-shopu",
  "Nové karty každý týden",
  "Platba kartou, převodem i dobírkou",
];

// Jedna sada se opakuje 3×, aby byla vždy širší než obrazovka (jinak by smyčka na konci
// ukázala prázdné místo a skočila). Pro čtečky obrazovky je vidět jen první opakování.
const REPEAT = 3;

function StripItems({ hidden }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden || undefined} className="flex gap-10 whitespace-nowrap pr-10">
      {Array.from({ length: REPEAT }, (_, r) =>
        STRIP.map((t) => (
          <span key={`${r}-${t}`} className="flex gap-10" aria-hidden={r > 0 || undefined}>
            <span>{t}</span>
            <span style={{ color: "var(--brand-yellow)" }}>✦</span>
          </span>
        )),
      )}
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
        <Marquee>
          <StripItems />
          <StripItems hidden />
        </Marquee>
      </div>
      <header style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-000)" }}>
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:gap-x-8 sm:gap-y-4 sm:px-6">
          <Link href="/" className="pl-wiggle-hover block flex-none" aria-label="PokeLou – domů">
            <Image src="/brand/logo.png" alt="PokeLou" width={128} height={128} priority className="h-[68px] w-[68px] sm:h-[128px] sm:w-[128px]" />
          </Link>
          <SearchBox />
          <nav aria-label="Hlavní" className="ml-auto flex flex-nowrap items-center gap-x-3 text-[15px] font-extrabold sm:ml-0 sm:gap-x-6">
            <Link href="/karty" className="py-2.5 no-underline">
              Karty
            </Link>
            <Link href="/karty" className="hidden py-2.5 no-underline sm:inline">
              Edice
            </Link>
            <Link href="/vykup" className="py-2.5 no-underline">
              Výkup
            </Link>
            <ThemeToggle />
            <a href={SHOP.instagramUrl} target="_blank" rel="noopener noreferrer" className="pl-ig pl-lift hidden sm:grid" aria-label={`Instagram ${SHOP.instagram} (otevře se v novém okně)`}>
              <InstagramIcon />
            </a>
            <Link
              href="/kosik"
              className="pl-lift flex items-center gap-2 rounded-full border-2 px-3 py-2 no-underline sm:px-4"
              style={{ background: "var(--brand-yellow)", color: "var(--on-yellow)", borderColor: "var(--ink)" }}
              aria-label={cartCount > 0 ? `Košík, ${cartCount} ${cartCount === 1 ? "kus" : cartCount < 5 ? "kusy" : "kusů"}` : "Košík je prázdný"}
            >
              <CartIcon />
              Košík
              {cartCount > 0 && (
                <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full text-xs" style={{ background: "var(--brand-red)", color: "var(--on-red)" }}>
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
