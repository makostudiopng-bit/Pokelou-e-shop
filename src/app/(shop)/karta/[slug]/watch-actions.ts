"use server";
// Přihlášení k hlídání karty z detailu. Potvrzení přijde e-mailem (double opt-in).
import { z } from "zod";
import { getDb, hasDb } from "@/db";
import { makeT } from "@/i18n/core";
import { getEurCzk, getLocale } from "@/i18n/server";
import { requestWatch } from "@/lib/watches";

export type WatchState = { status: "idle" | "pending" | "updated" | "error"; message?: string; attempt: number };

const schema = z.object({
  email: z.email().max(200),
  cardId: z.string().regex(/^[\w.-]{1,80}$/),
  max: z.string().max(20).optional(),
});

export async function watchAction(prev: WatchState, form: FormData): Promise<WatchState> {
  const attempt = prev.attempt + 1;
  const locale = await getLocale();
  const t = makeT(locale);
  const fail = (m: string): WatchState => ({ status: "error", message: t(m), attempt });

  // skryté pole, které vyplní jen roboti
  if (String(form.get("web") ?? "") !== "") return { status: "pending", message: t("Hotovo! Poslali jsme ti e-mail, potvrď v něm hlídání."), attempt };
  const parsed = schema.safeParse({ email: form.get("email"), cardId: form.get("cardId"), max: form.get("max") ?? undefined });
  if (!parsed.success) return fail(parsed.error.issues.some((i) => i.path[0] === "email") ? "Zkontroluj e-mail" : "Hlídání se nepodařilo uložit. Zkus to prosím za chvíli.");
  if (!hasDb()) return fail("Hlídání zatím nefunguje, e-shop ještě nemá napojenou databázi.");

  let maxPriceHal: number | null = null;
  const raw = parsed.data.max?.replace(/\s/g, "").replace(",", ".");
  if (raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return fail("Zadej cenu jako číslo, třeba 500.");
    // anglická verze zadává cenu v eurech
    maxPriceHal = Math.round(locale === "cs" ? n * 100 : n * (await getEurCzk()) * 100);
  }

  try {
    const r = await requestWatch(await getDb(), { email: parsed.data.email, cardId: parsed.data.cardId, maxPriceHal, locale });
    if (r === "limit") return fail("Na tenhle e-mail už hlídáš hodně karet. Zruš některé hlídání a zkus to znovu.");
    if (r === "updated") return { status: "updated", message: t("Hlídání jsme upravili, další e-mail už potvrzovat nemusíš."), attempt };
    return { status: "pending", message: t("Hotovo! Poslali jsme ti e-mail, potvrď v něm hlídání."), attempt };
  } catch (e) {
    console.error("Hlídání se nepovedlo", e);
    return fail("Hlídání se nepodařilo uložit. Zkus to prosím za chvíli.");
  }
}
