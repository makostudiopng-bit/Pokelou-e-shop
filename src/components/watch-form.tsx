"use client";
// Hlídání karty na detailu: tlačítko rozbalí krátký formulář (e-mail, u dostupné karty i cena).
import { useActionState, useState } from "react";
import { watchAction, type WatchState } from "@/app/(shop)/karta/[slug]/watch-actions";
import { useT } from "@/i18n/client";

export function WatchForm({
  cardId,
  mode,
  currentHal,
  defaultOpen,
  primary,
}: {
  cardId: string;
  /** stock: upozornit, až bude skladem; price: až cena klesne */
  mode: "stock" | "price";
  currentHal?: number;
  defaultOpen?: boolean;
  primary?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(!!defaultOpen);
  const [state, action, pending] = useActionState<WatchState, FormData>(watchAction, { status: "idle", attempt: 0 });
  const done = state.status === "pending" || state.status === "updated";
  const eur = t.locale !== "cs";
  // návrh: o 10 % méně než teď, zaokrouhleno
  const suggest = currentHal ? (eur ? Math.max(1, Math.floor((currentHal * 0.9) / 100 / t.eurCzk)) : Math.max(1, Math.floor((currentHal * 0.9) / 1000) * 10)) : undefined;

  return (
    <>
      <button
        type="button"
        className={`pl-btn ${primary ? "pl-btn--primary flex-[1_1_220px] pl-btn--block" : "pl-btn--secondary"}`}
        aria-expanded={open}
        aria-controls="hlidat"
        onClick={() => setOpen((v) => !v)}
      >
        {mode === "stock" ? t("Hlídat, až bude skladem") : t("Hlídat cenu")}
      </button>
      {open && (
        <div id="hlidat" className="basis-full rounded-xl p-4" style={{ background: "var(--surface-100)", border: "2px solid var(--line)" }}>
          {done ? (
            <p role="status" className="m-0 text-[15px] font-bold" style={{ color: "var(--success)" }}>
              ✓ {state.message}
            </p>
          ) : (
            <form action={action} className="flex flex-col gap-3">
              <p className="m-0 text-[15px]">
                {mode === "stock" ? t("Pošleme ti e-mail, jakmile bude karta zase skladem.") : t("Pošleme ti e-mail, až cena klesne na tvoji částku nebo níž.")}
              </p>
              <input type="hidden" name="cardId" value={cardId} />
              <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <div className="flex flex-wrap items-end gap-3">
                <label className="pl-field min-w-0 flex-[2_1_220px]">
                  <span className="pl-field__label">{t("E-mail")}</span>
                  <input name="email" type="email" required autoComplete="email" inputMode="email" placeholder={t("jan@email.cz")} className="pl-field__input" />
                </label>
                {mode === "price" && (
                  <label className="pl-field min-w-0 flex-[1_1_140px]">
                    <span className="pl-field__label">{t("Cena nejvýš")}</span>
                    <span className="pl-field__wrap">
                      <input name="max" inputMode="decimal" defaultValue={suggest} required className="pl-field__input w-full pr-9" />
                      <span className="pl-field__suffix">{eur ? "€" : t("Kč")}</span>
                    </span>
                  </label>
                )}
                <button type="submit" disabled={pending} className="pl-btn pl-btn--primary">
                  {pending ? t("Odesílám…") : t("Hlídat")}
                </button>
              </div>
              {state.status === "error" && (
                <p role="alert" className="m-0 text-sm font-bold" style={{ color: "var(--red-text)" }}>
                  {state.message}
                </p>
              )}
              <p className="pl-note m-0">{t("E-mail použijeme jen pro tohle upozornění. Hlídání zrušíš jedním kliknutím v e-mailu.")}</p>
            </form>
          )}
        </div>
      )}
    </>
  );
}
