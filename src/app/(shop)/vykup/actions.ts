"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CONDITIONS } from "@/db/schema";
import { getDb, hasDb } from "@/db";
import { createBuyback } from "@/lib/buyback";
import { BUYBACK_LANGUAGES, BUYBACK_MAX_ITEMS } from "@/lib/buyback-shared";
import { czAccountToIban, isValidIban } from "@/lib/spayd";
import { makeT } from "@/i18n/core";
import { getLocale } from "@/i18n/server";
import { after } from "next/server";
import { notifyBuybackCreated } from "@/lib/email/notify";

export type BuybackState = { attempt: number; errors: Partial<Record<"email" | "bankAccount" | "adult" | "items" | "form", string>> };

const itemsSchema = z
  .array(
    z.object({
      cardId: z.string().min(1).max(80),
      condition: z.enum(CONDITIONS),
      language: z.enum(BUYBACK_LANGUAGES as [string, ...string[]]),
      quantity: z.number().int().min(1).max(50),
    }),
  )
  .min(1)
  .max(BUYBACK_MAX_ITEMS);

const validAccount = (a: string) => czAccountToIban(a) != null || isValidIban(a);

export async function submitBuybackAction(prev: BuybackState, form: FormData): Promise<BuybackState> {
  const attempt = prev.attempt + 1;
  const locale = await getLocale();
  const t = makeT(locale);
  const errors: BuybackState["errors"] = {};
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const payout = str("payout") === "credit" ? "credit" : "cash";
  const email = str("email");
  const bankAccount = str("bankAccount").replace(/\s/g, "");

  if (!z.email().safeParse(email).success) errors.email = t("Zkontroluj e-mail");
  if (payout === "cash" && !validAccount(bankAccount)) errors.bankAccount = t("Číslo účtu ve tvaru 123456789/0100");
  if (form.get("adult") !== "on") errors.adult = t("Výkup je jen pro plnoleté. Pokud ti ještě není 18, požádej rodiče.");

  let items: z.infer<typeof itemsSchema> = [];
  try {
    const parsed = itemsSchema.safeParse(JSON.parse(str("items") || "[]"));
    if (parsed.success) items = parsed.data;
    else errors.items = t("Přidej aspoň jednu kartu");
  } catch {
    errors.items = t("Přidej aspoň jednu kartu");
  }
  if (Object.keys(errors).length) return { attempt, errors };
  if (!hasDb()) return { attempt, errors: { form: t("Výkup zatím nejde odeslat, e-shop ještě nemá napojenou databázi.") } };

  let id: string;
  try {
    const req = await createBuyback(await getDb(), { email, name: str("name") || undefined, payout, bankAccount, items, locale });
    id = req.id;
  } catch (e) {
    console.error("Výkup se nepovedl", e);
    const msg = e instanceof Error && e.message.startsWith("Žádná") ? t(e.message) : t("Výkup se nepodařilo uložit. Zkus to prosím za chvíli.");
    return { attempt, errors: { form: msg } };
  }
  after(() => notifyBuybackCreated(id));
  redirect(`/vykup/${id}`);
}
