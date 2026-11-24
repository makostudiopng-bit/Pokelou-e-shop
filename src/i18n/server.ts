// Jazyk na serveru: z cookie pl_lang, jinak čeština. Volba se mění přepínačem v hlavičce
// nebo odkazem s ?lang=en (vyřídí proxy).
import { cookies } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, LANG_COOKIE, makeT, type Locale } from "./core";

export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
});

export const getT = cache(async () => makeT(await getLocale()));
