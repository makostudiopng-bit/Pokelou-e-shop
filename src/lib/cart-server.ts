// Čtení košíku z cookie a jeho spojení se skladem (jen na serveru).
import { cookies } from "next/headers";
import { cache } from "react";
import { CART_COOKIE, parseCart, resolveCart, serializeCart, type CartLine } from "./cart";
import { getOffers } from "./catalog";

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

/** Počet kusů pro hlavičku (bez dotazu do skladu, stačí cookie). */
export async function cartCount() {
  return (await readCart()).reduce((a, l) => a + l.qty, 0);
}
