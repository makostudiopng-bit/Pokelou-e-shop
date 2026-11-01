// Čtení košíku z cookie a jeho spojení se skladem (jen na serveru).
import { cookies } from "next/headers";
import { cache } from "react";
import { CART_COOKIE, parseCart, resolveCart, serializeCart, type CartLine } from "./cart";
import { getOffers } from "./catalog";
import { getDb, hasDb } from "@/db";
import { checkCode, discountLabel, findCode, normalizeCode } from "./discounts";

export const CODE_COOKIE = "pl_code";

export async function readCart(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

/** Zápis jen ze Server Action nebo Route Handleru. */
export async function writeCart(lines: CartLine[]) {
  const store = await cookies();
  if (lines.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, serializeCart(lines), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export const getCartView = cache(async () => {
  const [lines, { offers }] = await Promise.all([readCart(), getOffers()]);
  return resolveCart(lines, offers);
});

export async function readCodeCookie() {
  return normalizeCode((await cookies()).get(CODE_COOKIE)?.value ?? "");
}

/** Zápis jen ze Server Action. Prázdný kód cookie smaže. */
export async function writeCodeCookie(code: string) {
  const store = await cookies();
  if (!code) store.delete(CODE_COOKIE);
  else store.set(CODE_COOKIE, code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export type AppliedDiscount =
  | { status: "none" }
  | { status: "ok"; code: string; id: string; label: string; discountHal: number }
  | { status: "invalid"; code: string; reason: string };

/** Uplatněný slevový kód proti aktuálnímu košíku (vždy znovu ověřený). */
export const getDiscount = cache(async (itemsHal: number): Promise<AppliedDiscount> => {
  const code = await readCodeCookie();
  if (!code) return { status: "none" };
  if (!hasDb()) return { status: "invalid", code, reason: "Slevové kódy zatím nefungují, e-shop nemá napojenou databázi." };
  try {
    const r = checkCode(await findCode(await getDb(), code), itemsHal);
    return r.ok
      ? { status: "ok", code, id: r.code.id, label: discountLabel(r.code), discountHal: r.discountHal }
      : { status: "invalid", code, reason: r.reason };
  } catch (e) {
    console.error("Slevový kód: ověření selhalo", e);
    return { status: "invalid", code, reason: "Kód teď nejde ověřit, zkus to za chvíli." };
  }
});

/** Počet kusů pro hlavičku (bez dotazu do skladu, stačí cookie). */
export async function cartCount() {
  return (await readCart()).reduce((a, l) => a + l.qty, 0);
}
