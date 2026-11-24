// Jazyk na serveru: z cookie pl_lang, jinak čeština. Volba se mění přepínačem v hlavičce
// nebo odkazem s ?lang=en (vyřídí proxy).
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb, hasDb } from "@/db";
import { latestRate } from "@/lib/buyback";
import { FALLBACK_EUR_CZK } from "@/lib/pricing";
import { DEFAULT_LOCALE, isLocale, LANG_COOKIE, makeT, type Locale } from "./core";

export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
});

/** Poslední kurz ČNB z databáze (stahuje ho noční synchronizace). Česká verze ho nepotřebuje. */
export const getEurCzk = cache(async (): Promise<number> => {
  if (!hasDb()) return FALLBACK_EUR_CZK;
  try {
    return await latestRate(await getDb());
  } catch (e) {
    console.error("Kurz ČNB: databáze nedostupná", e);
    return FALLBACK_EUR_CZK;
  }
});

export const getT = cache(async () => {
  const locale = await getLocale();
  return makeT(locale, locale === "cs" ? undefined : await getEurCzk());
});
