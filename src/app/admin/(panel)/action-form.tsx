"use client";
// Formulář administrace s hláškou o výsledku (uloženo / chyba).
import { useActionState, type ReactNode } from "react";
import type { ActionState } from "./actions";

export function ActionForm({
  action,
  children,
  className,
  confirm,
}: {
  action: (prev: ActionState, f: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  /** Otázka před odesláním u nevratných kroků: hodnota tlačítka "to" → otázka */
  confirm?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        const to = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? "";
        const q = confirm?.[to];
        if (q && !window.confirm(q)) e.preventDefault();
      }}
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {(state.ok || state.error) && (
        <p role="status" className="m-0 w-full text-sm font-bold" style={{ color: state.error ? "var(--brand-red)" : "var(--success)" }}>
          {state.error ?? state.ok}
        </p>
      )}
    </form>
  );
}

/** Tlačítko kroku: pošle "to" = cílový stav. */
export function StepButton({ to, label, variant = "secondary" }: { to: string; label: string; variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button type="submit" name="to" value={to} className={`pl-btn pl-btn--${variant} pl-btn--sm`}>
      {label}
    </button>
  );
}
