import Link from "next/link";
import { SHOP } from "@/config/shop";

export function SiteFooter() {
  return (
    <footer style={{ borderTop: "3px solid var(--ink)", background: "var(--surface-200)" }}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-6 px-4 py-8 text-sm leading-6 sm:px-6" style={{ color: "var(--ink-muted)" }}>
        <div className="flex flex-col gap-1">
          <strong style={{ color: "var(--ink)" }}>PokeLou</strong>
          <span>
            {SHOP.operator} · IČO {SHOP.ico.replace(/^\[IČO\]$/, "[doplnit]")}
          </span>
          <span>
            <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a> · {SHOP.phone} · Instagram {SHOP.instagram}
          </span>
        </div>
        <nav aria-label="Informace" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/obchodni-podminky">Obchodní podmínky</Link>
          <Link href="/reklamace">Reklamace</Link>
          <Link href="/doprava-a-platba">Doprava a platba</Link>
          <Link href="/stav-karet">Průvodce stavem karet</Link>
          <Link href="/vykup-podminky">Podmínky výkupu</Link>
          <Link href="/ochrana-osobnich-udaju">Ochrana osobních údajů</Link>
        </nav>
      </div>
      <p className="mx-auto max-w-[1280px] px-4 pb-6 text-xs leading-[18px] sm:px-6" style={{ color: "var(--ink-muted)" }}>
        Pokémon a související názvy jsou ochranné známky společností Nintendo, Creatures Inc., GAME FREAK Inc. a The
        Pokémon Company. PokeLou s nimi není spojen.
      </p>
    </footer>
  );
}
