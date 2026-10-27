"use server";
// Všechny akce administrace. Každá na začátku ověří přihlášení – Server Actions jdou
// zavolat i přímým POSTem, proxy na ně spoléhat nejde.
import { revalidatePath } from "next/cache";
import { CONDITIONS, FINISHES, type Condition, type Finish } from "@/db/schema";
import { getDb } from "@/db";
import {
  AdminError,
  intakeStock,
  saveBuybackCheck,
  setBuybackStatus,
  setOrderStatus,
  stockFromBuyback,
  updateStockItem,
} from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-session";
import type { BuybackStatus, OrderStatus } from "@/lib/admin-status";
import { BUYBACK_LANGUAGES } from "@/lib/buyback-shared";
import { importSet } from "@/lib/sync";

export type ActionState = { ok?: string; error?: string };

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};
/** "1 290" nebo "1290,50" Kč → haléře; null když prázdné, NaN když nesmysl */
const kcToHal = (v: string) => (v === "" ? null : Math.round(Number(v.replace(/\s/g, "").replace(",", ".")) * 100));

async function run(fn: () => Promise<string | void>): Promise<ActionState> {
  await requireAdmin();
  try {
    const msg = await fn();
    return { ok: msg || "Uloženo" };
  } catch (e) {
    if (e instanceof AdminError) return { error: e.message };
    console.error("Administrace: akce selhala", e);
    return { error: "Něco se nepovedlo. Zkus to znovu." };
  }
}

export async function orderStatusAction(_p: ActionState, f: FormData) {
  const id = str(f, "id");
  const r = await run(async () => {
    await setOrderStatus(await getDb(), id, str(f, "to") as OrderStatus, { tracking: str(f, "tracking") });
  });
  revalidatePath("/admin", "layout");
  return r;
}

export async function buybackStatusAction(_p: ActionState, f: FormData) {
  const r = await run(async () => {
    await setBuybackStatus(await getDb(), str(f, "id"), str(f, "to") as BuybackStatus);
  });
  revalidatePath("/admin", "layout");
  return r;
}

export async function buybackCheckAction(_p: ActionState, f: FormData) {
  const id = str(f, "id");
  const ids = f.getAll("itemId").filter((x): x is string => typeof x === "string");
  return run(async () => {
    const checks = ids.map((itemId) => {
      const condition = str(f, `cond-${itemId}`) as Condition;
      const finalHal = kcToHal(str(f, `final-${itemId}`));
      if (!CONDITIONS.includes(condition)) throw new AdminError("Neplatný stav karty");
      if (finalHal == null || Number.isNaN(finalHal)) throw new AdminError("Vyplň konečnou cenu u všech karet");
      return { itemId, condition, finalHal };
    });
    await saveBuybackCheck(await getDb(), id, checks);
    revalidatePath(`/admin/vykupy/${id}`);
    return "Kontrola uložená";
  });
}

export async function buybackToStockAction(_p: ActionState, f: FormData) {
  const id = str(f, "id");
  const r = await run(async () => {
    const n = await stockFromBuyback(await getDb(), id);
    return n ? `Naskladněno ${n} položek` : "Není co naskladnit";
  });
  revalidatePath(`/admin/vykupy/${id}`);
  return r;
}

export async function stockUpdateAction(_p: ActionState, f: FormData) {
  const r = await run(async () => {
    const priceHal = kcToHal(str(f, "price"));
    const quantity = Number.parseInt(str(f, "qty"), 10);
    if (priceHal == null || Number.isNaN(priceHal)) throw new AdminError("Zadej cenu");
    await updateStockItem(await getDb(), str(f, "id"), { priceHal, quantity, priceLocked: f.get("locked") === "on" });
  });
  revalidatePath("/admin/sklad");
  return r;
}

export async function intakeAction(_p: ActionState, f: FormData) {
  return run(async () => {
    const condition = str(f, "condition") as Condition;
    const finish = str(f, "finish") as Finish;
    const language = str(f, "language");
    if (!CONDITIONS.includes(condition) || !FINISHES.includes(finish) || !BUYBACK_LANGUAGES.includes(language)) throw new AdminError("Vyber stav, provedení a jazyk");
    const priceHal = kcToHal(str(f, "price"));
    const purchaseHal = kcToHal(str(f, "purchase"));
    if (Number.isNaN(priceHal) || Number.isNaN(purchaseHal)) throw new AdminError("Cena musí být číslo");
    const res = await intakeStock(await getDb(), {
      cardId: str(f, "cardId"),
      condition,
      language,
      finish,
      quantity: Number.parseInt(str(f, "qty"), 10),
      priceHal: priceHal ?? undefined,
      purchaseHal: purchaseHal ?? undefined,
      priceLocked: f.get("locked") === "on",
    });
    revalidatePath("/admin/naskladnit");
    return res.merged ? "Přidáno ke stejnému kusu na skladě" : "Naskladněno";
  });
}

export async function importSetAction(_p: ActionState, f: FormData) {
  const setId = str(f, "setId").toLowerCase();
  if (!/^[a-z0-9.]{2,20}$/.test(setId)) return { error: "ID edice vypadá jako sv03.5 nebo swsh9" };
  const r = await run(async () => {
    const res = await importSet(await getDb(), setId, { day: new Date().toISOString().slice(0, 10) });
    return `Edice ${res.set}: ${res.cards} karet${res.failed.length ? `, nepovedlo se ${res.failed.length}` : ""}`;
  });
  revalidatePath("/admin/edice");
  return r;
}
