// Kostra informačních a právních stránek. Dokud texty neschválí klient (a ideálně právník),
// ukazuje se nahoře upozornění. Vypne se proměnnou LEGAL_APPROVED=1.
import Link from "next/link";
import type { ReactNode } from "react";
import { SHOP } from "@/config/shop";
import { getT } from "@/i18n/server";

export const legalApproved = () => process.env.LEGAL_APPROVED === "1";

/** Údaj, který musí doplnit klient: zvýrazní se, dokud v něm jsou hranaté závorky. */
export function Ph({ children }: { children: string }) {
  return /\[.*\]/.test(children) ? <span className="ph">{children}</span> : <>{children}</>;
}

export function Operator() {
  return (
    <>
      <Ph>{SHOP.operator}</Ph>, IČO <Ph>{SHOP.ico}</Ph>, se sídlem <Ph>{SHOP.address}</Ph>, e-mail{" "}
      <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>, telefon <Ph>{SHOP.phone}</Ph>
      {SHOP.vatPayer == null ? <>, <Ph>[plátce / neplátce DPH]</Ph></> : SHOP.vatPayer ? ", plátce DPH" : ", neplátce DPH"}
    </>
  );
}

/**
 * czechOnly: právní dokument zatím jen česky (závazné znění). Anglický návštěvník uvidí
 * nahoře vysvětlení a český text pod ním. Překlad dodáme, až texty projdou kontrolou.
 */
export async function LegalPage({ title, updated, intro, czechOnly, children }: { title: string; updated: string; intro?: ReactNode; czechOnly?: boolean; children: ReactNode }) {
  const t = await getT();
  const czechText = czechOnly && t.locale !== "cs";
  return (
    <main className="mx-auto flex max-w-[860px] flex-col gap-4 px-4 pt-6 pb-16 sm:px-6">
      <nav aria-label={t("Drobečková navigace")} className="flex gap-2 text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
        <Link href="/" style={{ color: "var(--ink-muted)" }}>
          {t("Domů")}
        </Link>
        <span aria-hidden="true">/</span>
        <span>{czechText ? t(title) : title}</span>
      </nav>
      <h1 className="m-0 text-[38px] leading-[40px] font-extrabold sm:text-[48px] sm:leading-[48px]" style={{ fontFamily: "var(--font-display)" }}>
        {czechText ? t(title) : title}
      </h1>
      {czechText && (
        <p role="note" className="m-0 rounded-xl px-4 py-3 text-[15px]" style={{ background: "var(--surface-100)", border: "2px solid var(--line-strong)" }}>
          {t("Tento dokument je zatím k dispozici jen v češtině, která je závazným zněním. Pokud potřebuješ s něčím pomoct, napiš nám na")}{" "}
          <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>.
        </p>
      )}
      <p className="pl-note m-0" lang={czechText ? "cs" : undefined}>
        {czechText ? "Platné od" : t("Platné od")} <Ph>{updated}</Ph>
      </p>
      {!legalApproved() && (
        <p role="note" className="m-0 rounded-xl px-4 py-3 text-[15px]" style={{ background: "var(--surface-100)", border: "2px dashed var(--brand-red)" }}>
          <strong>{t("Pracovní verze.")}</strong> {t("Text je vzor připravený k doplnění údajů a kontrole, než e-shop spustíme naostro. Zvýrazněná místa doplní provozovatel.")}
        </p>
      )}
      {intro && <div className="pl-prose" lang={czechText ? "cs" : undefined}>{intro}</div>}
      <div className="pl-prose" lang={czechText ? "cs" : undefined}>{children}</div>
    </main>
  );
}
