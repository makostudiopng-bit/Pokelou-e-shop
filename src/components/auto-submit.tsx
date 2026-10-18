"use client";
// Odešle formulář filtrů hned po změně (bez JS zůstává tlačítko „Použít filtry“).
import { useEffect } from "react";

export function AutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const isPrice = (t: EventTarget | null) => t instanceof HTMLInputElement && t.inputMode === "numeric";
    // ceny se odešlou až po opuštění pole nebo Enteru, ať se stránka nepřenačítá při psaní
    const onChange = (e: Event) => {
      if (!isPrice(e.target)) form.requestSubmit();
    };
    const onBlur = (e: FocusEvent) => {
      const t = e.target;
      if (isPrice(t) && (t as HTMLInputElement).defaultValue !== (t as HTMLInputElement).value) form.requestSubmit();
    };
    // Prázdná pole a výchozí řazení do adresy nepatří (?od=&do=&razeni=nove).
    // Posluchač na formuláři běží dřív než odeslání v next/form (to poslouchá až na kořeni).
    const onSubmit = () => {
      const fields = [...form.elements, ...document.querySelectorAll(`[form="${formId}"]`)] as HTMLInputElement[];
      const off = fields.filter((el) => el.name && !el.disabled && (el.value === "" || (el.name === "razeni" && el.value === "nove")));
      off.forEach((el) => (el.disabled = true));
      setTimeout(() => off.forEach((el) => (el.disabled = false)));
    };
    form.addEventListener("submit", onSubmit);
    form.addEventListener("change", onChange);
    form.addEventListener("focusout", onBlur);
    // select řazení stojí mimo <form> (atribut form=), jeho change do formuláře nebublá
    const outside = [...document.querySelectorAll<HTMLElement>(`[form="${formId}"]`)];
    outside.forEach((el) => el.addEventListener("change", onChange));
    return () => {
      form.removeEventListener("submit", onSubmit);
      form.removeEventListener("change", onChange);
      form.removeEventListener("focusout", onBlur);
      outside.forEach((el) => el.removeEventListener("change", onChange));
    };
  }, [formId]);
  return null;
}
