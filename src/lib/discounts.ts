// Slevové kódy. Sleva se počítá jen z ceny karet (ne z dopravy) a nikdy nepřesáhne jejich cenu.
// Použití kódu se v objednávce „zabere“ jedním atomickým příkazem, takže kód s omezeným počtem
// použití nejde přečerpat ani při dvou objednávkách ve stejnou chvíli.
import { and, eq, gt, isNull, lt, lte, or, sql, desc } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { formatCzk } from "./pricing";

export type DiscountCode = typeof s.discountCodes.$inferSelect;

export class DiscountError extends Error {}

/** „ jaro 10 “ → „JARO10“ */
export const normalizeCode = (c: string) => c.toUpperCase().replace(/\s+/g, "").slice(0, 40);

/** Kolik kód odečte z ceny karet (haléře). */
export function discountAmount(code: Pick<DiscountCode, "kind" | "value">, itemsHal: number) {
  const raw = code.kind === "percent" ? Math.round((itemsHal * Math.min(100, Math.max(0, code.value))) / 100) : code.value;
  return Math.max(0, Math.min(itemsHal, raw));
}

/** Popis slevy pro zákazníka: „−10 %“ nebo „−200 Kč“. */
export const discountLabel = (code: Pick<DiscountCode, "kind" | "value">) =>
  code.kind === "percent" ? `−${code.value} %` : `−${formatCzk(code.value)}`;

export type CodeCheck = { ok: true; code: DiscountCode; discountHal: number } | { ok: false; reason: string };

/** Ověří kód proti košíku. Důvod odmítnutí je napsaný pro zákazníka. */
export function checkCode(code: DiscountCode | undefined, itemsHal: number, now = new Date()): CodeCheck {
  if (!code || !code.active) return { ok: false, reason: "Tenhle slevový kód neznáme." };
  if (code.validFrom && code.validFrom > now) return { ok: false, reason: "Kód ještě neplatí." };
  if (code.validUntil && code.validUntil <= now) return { ok: false, reason: "Platnost kódu už skončila." };
  if (code.maxUses != null && code.usedCount >= code.maxUses) return { ok: false, reason: "Kód už byl vyčerpaný." };
  if (code.minOrderHal != null && itemsHal < code.minOrderHal) {
    return { ok: false, reason: `Kód platí od nákupu karet za ${formatCzk(code.minOrderHal)}.` };
  }
  return { ok: true, code, discountHal: discountAmount(code, itemsHal) };
}

export async function findCode(db: Db, code: string) {
  const c = normalizeCode(code);
  if (!c) return undefined;
  const [row] = await db.select().from(s.discountCodes).where(eq(s.discountCodes.code, c));
  return row;
}

/** Zabere jedno použití kódu; vrací řádek kódu, nebo null když už neplatí. */
export async function claimCode(db: Db, id: string, now = new Date()) {
  const t = s.discountCodes;
  const [row] = await db
    .update(t)
    .set({ usedCount: sql`${t.usedCount} + 1` })
    .where(
      and(
        eq(t.id, id),
        eq(t.active, true),
        or(isNull(t.validFrom), lte(t.validFrom, now)),
        or(isNull(t.validUntil), gt(t.validUntil, now)),
        or(isNull(t.maxUses), lt(t.usedCount, t.maxUses)),
      ),
    )
    .returning();
  return row ?? null;
}

/** Vrátí použití kódu (zrušená objednávka nebo chyba při ukládání). */
export async function releaseCode(db: Db, code: string) {
  const t = s.discountCodes;
  await db
    .update(t)
    .set({ usedCount: sql`greatest(${t.usedCount} - 1, 0)` })
    .where(eq(t.code, code));
}

// ---------- Administrace ----------

export type NewCode = {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  minOrderHal: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  maxUses: number | null;
  note: string | null;
};

export function validateNewCode(c: NewCode): string | null {
  if (!/^[A-Z0-9_-]{3,40}$/.test(c.code)) return "Kód: 3–40 znaků, jen písmena bez diakritiky, číslice, - a _.";
  if (!Number.isInteger(c.value) || c.value <= 0) return "Zadej výši slevy.";
  if (c.kind === "percent" && c.value > 100) return "Procentní sleva může být nejvýš 100 %.";
  if (c.minOrderHal != null && (!Number.isFinite(c.minOrderHal) || c.minOrderHal < 0)) return "Minimální nákup nedává smysl.";
  if (c.maxUses != null && (!Number.isInteger(c.maxUses) || c.maxUses < 1)) return "Počet použití musí být aspoň 1.";
  if (c.validFrom && c.validUntil && c.validUntil <= c.validFrom) return "Konec platnosti musí být po začátku.";
  return null;
}

export async function createCode(db: Db, c: NewCode) {
  const err = validateNewCode(c);
  if (err) throw new DiscountError(err);
  try {
    await db.insert(s.discountCodes).values(c);
  } catch (e) {
    const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") throw new DiscountError(`Kód ${c.code} už existuje.`);
    throw e;
  }
}

export async function setCodeActive(db: Db, id: string, active: boolean) {
  await db.update(s.discountCodes).set({ active }).where(eq(s.discountCodes.id, id));
}

export async function listCodes(db: Db) {
  return db.select().from(s.discountCodes).orderBy(desc(s.discountCodes.createdAt));
}
