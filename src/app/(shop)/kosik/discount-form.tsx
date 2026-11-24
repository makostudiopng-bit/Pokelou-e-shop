"use client";
// Pole pro slevový kód v souhrnu košíku.
import { useActionState } from "react";
import { applyCodeAction, removeCodeAction, type CodeState } from "./actions";
import { useT } from "@/i18n/client";

export function DiscountForm({ applied, invalid }: { applied?: { code: string; label: string }; invalid?: { code: string; reason: string } }) {
  const t = useT();
  const [state, action, pending] = useActionState<CodeState, FormData>(applyCodeAction, {});
  if (applied) {
    return (
      <form action={removeCodeAction} className="pl-code pl-code--on">
        <span className="pl-code__tag">
          <span aria-hidden="true">🏷️</span>
          <strong>{applied.code}</strong>
          <span>{applied.label}</span>
        </span>
        <button type="submit" className="pl-linkbtn">
          {t("Odebrat")}
        </button>
      </form>
    );
  }
  const error = state.error ?? invalid?.reason;
  return (
    <details className="pl-code" open={Boolean(error) || undefined}>
      <summary>{t("Mám slevový kód")}</summary>
      <form action={action} className="mt-2 flex flex-col gap-1.5">
        <div className="flex gap-2">
          <label htmlFor="kod" className="sr-only">
            {t("Slevový kód")}
          </label>
          <input
            id="kod"
            name="kod"
            defaultValue={invalid?.code}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder={t("např. JARO10")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "kod-err" : undefined}
            className="pl-field__input min-w-0 flex-1 uppercase"
          />
          <button type="submit" disabled={pending} className="pl-btn pl-btn--secondary pl-btn--sm">
            {pending ? t("Ověřuji…") : t("Uplatnit")}
          </button>
        </div>
        {error && (
          <span id="kod-err" role="alert" className="pl-field__error">
            {error}
          </span>
        )}
      </form>
    </details>
  );
}
