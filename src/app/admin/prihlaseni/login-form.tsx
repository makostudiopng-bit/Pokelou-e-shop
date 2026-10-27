"use client";
import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className={`pl-field${state.error ? " pl-field--error" : ""}`}>
        <label htmlFor="pw" className="pl-field__label">
          Heslo
        </label>
        <input id="pw" name="password" type="password" autoComplete="current-password" required autoFocus className="pl-field__input" aria-invalid={state.error ? true : undefined} aria-describedby={state.error ? "pw-err" : undefined} />
        {state.error && (
          <span id="pw-err" role="alert" className="pl-field__error">
            {state.error}
          </span>
        )}
      </div>
      <button type="submit" disabled={pending} className="pl-btn pl-btn--primary pl-btn--block">
        {pending ? "Přihlašuji…" : "Přihlásit"}
      </button>
    </form>
  );
}
