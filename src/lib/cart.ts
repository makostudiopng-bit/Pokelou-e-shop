// Košík jako čisté funkce. Ukládá se do cookie jako "id*počet|id*počet".
// Ceny a dostupnost se nikdy neberou z cookie, vždy se dopočítají ze skladu.
import type { Offer } from "./catalog-query";

export type CartLine = { id: string; qty: number };

export const CART_COOKIE = "pl_cart";
export const MAX_LINES = 50;
export const MAX_QTY = 20;

const ID_RE = /^[A-Za-z0-9._-]{1,120}$/;

export function parseCart(raw: string | undefined | null): CartLine[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const lines: CartLine[] = [];
  for (const part of raw.split("|")) {
    const [id, q] = part.split("*");
    const qty = Number.parseInt(q ?? "", 10);
    if (!id || !ID_RE.test(id) || !Number.isFinite(qty) || qty < 1 || seen.has(id)) continue;
    seen.add(id);
    lines.push({ id, qty: Math.min(qty, MAX_QTY) });
    if (lines.length >= MAX_LINES) break;
  }
  return lines;
}

export const serializeCart = (lines: CartLine[]) => lines.map((l) => `${l.id}*${l.qty}`).join("|");

/** Přidá kusy, nejvýš kolik je skladem. Vrací nový košík a kolik se opravdu přidalo. */
export function addToCart(lines: CartLine[], id: string, qty: number, stock: number) {
  const current = lines.find((l) => l.id === id)?.qty ?? 0;
  const max = Math.min(stock, MAX_QTY);
  const next = Math.min(current + Math.max(1, Math.floor(qty)), max);
  const added = Math.max(0, next - current);
  if (next <= 0) return { lines, added: 0 };
  const exists = lines.some((l) => l.id === id);
  if (!exists && lines.length >= MAX_LINES) return { lines, added: 0 };
  return {
    lines: exists ? lines.map((l) => (l.id === id ? { ...l, qty: next } : l)) : [...lines, { id, qty: next }],
    added,
  };
}

/** Nastaví počet (0 = odebrat), nejvýš kolik je skladem. */
export function setQty(lines: CartLine[], id: string, qty: number, stock: number): CartLine[] {
  const q = Math.min(Math.floor(qty), stock, MAX_QTY);
  if (!Number.isFinite(q) || q <= 0) return lines.filter((l) => l.id !== id);
  return lines.map((l) => (l.id === id ? { ...l, qty: q } : l));
}

export type CartViewLine = CartLine & { offer: Offer; lineHal: number; adjusted: boolean };

/**
 * Spojí košík se skladem: zahodí neexistující kusy, sníží počty nad stav skladu
 * a spočítá mezisoučet. `adjusted` = počet se musel změnit (někdo kartu mezitím koupil).
 */
export function resolveCart(lines: CartLine[], offers: Offer[]) {
  const byId = new Map(offers.map((o) => [o.id, o]));
  const view: CartViewLine[] = [];
  const removed: string[] = [];
  for (const l of lines) {
    const offer = byId.get(l.id);
    if (!offer || offer.stock <= 0) {
      removed.push(offer?.name ?? l.id);
      continue;
    }
    const qty = Math.min(l.qty, offer.stock);
    view.push({ id: l.id, qty, offer, lineHal: qty * offer.priceHal, adjusted: qty !== l.qty });
  }
  return {
    lines: view,
    removed,
    count: view.reduce((a, l) => a + l.qty, 0),
    subtotalHal: view.reduce((a, l) => a + l.lineHal, 0),
  };
}
