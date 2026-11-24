"use client";
// Jazyk pro klientské komponenty. Hodnotu dodá kořenový layout ze serveru, takže se server
// a prohlížeč nikdy neliší.
import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, makeT, type Locale } from "./core";

const Ctx = createContext<{ locale: Locale; eurCzk?: number }>({ locale: DEFAULT_LOCALE });

export function LocaleProvider({ locale, eurCzk, children }: { locale: Locale; eurCzk?: number; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, eurCzk }), [locale, eurCzk]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  const { locale, eurCzk } = useContext(Ctx);
  return useMemo(() => makeT(locale, eurCzk), [locale, eurCzk]);
}
