"use client";
// Jazyk pro klientské komponenty. Hodnotu dodá kořenový layout ze serveru, takže se server
// a prohlížeč nikdy neliší.
import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, makeT, type Locale } from "./core";

const Ctx = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useT() {
  const locale = useContext(Ctx);
  return useMemo(() => makeT(locale), [locale]);
}
