// Základní nastavení jazyků bez slovníku (stačí to proxy, ať se do ní slovník nebalí).
export const LOCALES = ["cs", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "cs";
export const LANG_COOKIE = "pl_lang";

export const isLocale = (v: unknown): v is Locale => v === "cs" || v === "en";
