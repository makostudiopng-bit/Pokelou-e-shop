// Kostra informačních a právních stránek. Dokud texty neschválí klient (a ideálně právník),
// ukazuje se nahoře upozornění. Vypne se proměnnou LEGAL_APPROVED=1.
import Link from "next/link";
import type { ReactNode } from "react";
import { SHOP } from "@/config/shop";

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

export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-[860px] flex-col gap-4 px-4 pt-6 pb-16 sm:px-6">
      <nav aria-label="Drobečková navigace" className="flex gap-2 text-[13px] leading-[18px]" style={{ color: "var(--ink-muted)" }}>
        <Link href="/" style={{ color: "var(--ink-muted)" }}>
          Domů
        </Link>
        <span aria-hidden="true">/</span>
        <span>{title}</span>
      </nav>
      <h1 className="m-0 text-[38px] leading-[40px] font-extrabold sm:text-[48px] sm:leading-[48px]" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h1>
      <p className="pl-note m-0">
        Platné od <Ph>{updated}</Ph>
      </p>
      {!legalApproved() && (
        <p role="note" className="m-0 rounded-xl px-4 py-3 text-[15px]" style={{ background: "var(--surface-100)", border: "2px dashed var(--brand-red)" }}>
          <strong>Pracovní verze.</strong> Text je vzor připravený k doplnění údajů a kontrole, než e-shop spustíme naostro. Zvýrazněná místa doplní provozovatel.
        </p>
      )}
      {intro && <div className="pl-prose">{intro}</div>}
      <div className="pl-prose">{children}</div>
    </main>
  );
}
