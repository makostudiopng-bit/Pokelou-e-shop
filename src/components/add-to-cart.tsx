"use client";
// Tlačítko „Do košíku“ s okamžitou odezvou. Funguje i bez JavaScriptu (obyčejný formulář).
import { useActionState, useEffect, useState } from "react";
import { addToCartAction, type AddState } from "@/app/(shop)/kosik/actions";
import { tk } from "@/i18n/core";
import { useT } from "@/i18n/client";

const LABEL: Record<AddState["status"], string> = {
  idle: "",
  added: tk("Přidáno do košíku"),
  max: tk("Víc kusů nemáme skladem"),
  unavailable: tk("Tahle karta se mezitím prodala"),
};

export function AddToCart({
  offerId,
  label,
  size = "md",
  block,
  quantity,
  max,
  compact,
}: {
  offerId: string;
  label?: string;
  size?: "md" | "sm";
  block?: boolean;
  /** Zobrazit pole s počtem kusů (detail karty). */
  quantity?: boolean;
  max?: number;
  /** Dlaždice v mřížce: hláška jen v tlačítku, aby se nerozbilo rozložení. */
  compact?: boolean;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(addToCartAction, { status: "idle" });
  // „V košíku ✓“ jen na chvíli, pak zase jde přidat další kus
  const [expired, setExpired] = useState<AddState | null>(null);
  useEffect(() => {
    if (state.status === "idle") return;
    const t = setTimeout(() => setExpired(state), 2500);
    return () => clearTimeout(t);
  }, [state]);
  const flash = state.status !== "idle" && expired !== state;
  const done = flash && state.status === "added";
  return (
    <form action={action} className={compact ? "contents" : `flex flex-wrap items-end gap-3 ${block ? "w-full" : ""}`}>
      <input type="hidden" name="kus" value={offerId} />
      {quantity && (
        <label className="pl-field w-[110px]">
          <span className="pl-field__label">{t("Počet")}</span>
          <span className="pl-field__wrap">
            <input className="pl-field__input w-full pr-9" type="number" name="pocet" min={1} max={max} defaultValue={1} />
            <span className="pl-field__suffix">{t("ks")}</span>
          </span>
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className={`pl-btn pl-btn--primary${size === "sm" ? " pl-btn--sm" : ""}${block ? " pl-btn--block" : ""} ${quantity ? "flex-[1_1_220px]" : ""}`}
      >
        {pending ? t("Přidávám…") : done ? t("V košíku ✓") : flash && compact && state.status === "max" ? t("Max. skladem") : flash && compact && state.status === "unavailable" ? t("Prodáno") : (label ?? t("Do košíku"))}
      </button>
      <span role="status" aria-live="polite" className={state.status === "idle" || compact ? "sr-only" : "pl-note w-full"}>
        {LABEL[state.status] && t(LABEL[state.status])}
      </span>
    </form>
  );
}
