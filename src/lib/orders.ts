// Vytvoření a načtení objednávky. Bez interaktivních transakcí (Neon HTTP je nemá):
// sklad se odečte jedním příkazem, a když se cokoli nepovede, odečet se vrátí zpět.
import { eq, sql } from "drizzle-orm";
import { rowsOf, type Db } from "@/db";
import * as s from "@/db/schema";
import type { CheckoutInput } from "./checkout";
import { newOrderNumber, totals } from "./checkout";

export type OrderLine = {
  stockItemId: string;
  qty: number;
  unitHal: number;
  title: string;
  condition: s.Condition;
  language: string;
};

export class StockConflictError extends Error {
  constructor(public stockItemIds: string[]) {
    super("Některé kusy už nejsou skladem");
  }
}

/** Odečte všechny kusy najednou; vrátí ID kusů, které se odečíst nepodařilo. */
async function takeStock(db: Db, lines: OrderLine[]) {
  const want = sql.join(
    lines.map((l) => sql`(${l.stockItemId}::text, ${l.qty}::int)`),
    sql`, `,
  );
  const res = await db.execute(sql`
    with want(id, qty) as (values ${want})
    update stock_items s set quantity = s.quantity - w.qty, updated_at = now()
    from want w
    where s.id = w.id and s.quantity - s.reserved >= w.qty
    returning s.id`);
  const taken = new Set(rowsOf<{ id: string }>(res).map((r) => r.id));
  return { taken, missing: lines.filter((l) => !taken.has(l.stockItemId)).map((l) => l.stockItemId) };
}

export async function giveBack(db: Db, lines: Pick<OrderLine, "stockItemId" | "qty">[]) {
  if (lines.length === 0) return;
  const back = sql.join(
    lines.map((l) => sql`(${l.stockItemId}::text, ${l.qty}::int)`),
    sql`, `,
  );
  await db.execute(sql`
    with back(id, qty) as (values ${back})
    update stock_items s set quantity = s.quantity + b.qty, updated_at = now()
    from back b where s.id = b.id`);
}

export async function createOrder(db: Db, lines: OrderLine[], input: CheckoutInput) {
  if (lines.length === 0) throw new Error("Prázdný košík");
  const { taken, missing } = await takeStock(db, lines);
  if (missing.length > 0) {
    await giveBack(db, lines.filter((l) => taken.has(l.stockItemId)));
    throw new StockConflictError(missing);
  }

  const itemsHal = lines.reduce((a, l) => a + l.qty * l.unitHal, 0);
  const t = totals(itemsHal, input.shipping, input.payment);
  try {
    for (let attempt = 0; ; attempt++) {
      const { number, vs } = newOrderNumber();
      try {
        const [order] = await db
          .insert(s.orders)
          .values({
            number,
            email: input.email.toLowerCase(),
            phone: input.phone,
            name: input.name,
            address: input.shipping === "ceska_posta" ? { street: input.street, city: input.city, zip: input.zip, country: "CZ" } : null,
            companyId: input.company ? input.companyId : null,
            shippingMethod: input.shipping,
            shippingPoint: input.shipping === "zasilkovna" ? { name: input.point } : null,
            shippingHal: t.shippingHal,
            paymentMethod: input.payment,
            codFeeHal: t.codFeeHal,
            itemsHal: t.itemsHal,
            totalHal: t.totalHal,
            paymentRef: vs,
          })
          .returning();
        await db.insert(s.orderItems).values(
          lines.map((l) => ({
            orderId: order.id,
            stockItemId: l.stockItemId,
            quantity: l.qty,
            unitHal: l.unitHal,
            title: l.title,
            condition: l.condition,
            language: l.language,
          })),
        );
        return order;
      } catch (e) {
        // kolize čísla objednávky (unikátní index) → zkusit jiné
        const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;
        if (code === "23505" && attempt < 4) continue;
        throw e;
      }
    }
  } catch (e) {
    await giveBack(db, lines);
    throw e;
  }
}

export async function getOrder(db: Db, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, id));
  if (!order) return null;
  const items = await db
    .select({ item: s.orderItems, photos: s.stockItems.photos, image: s.cards.imageUrl, cardId: s.cards.id })
    .from(s.orderItems)
    .innerJoin(s.stockItems, eq(s.orderItems.stockItemId, s.stockItems.id))
    .innerJoin(s.cards, eq(s.stockItems.cardId, s.cards.id))
    .where(eq(s.orderItems.orderId, id));
  return {
    order,
    items: items.map((r) => ({ ...r.item, image: r.photos[0] ?? r.image, cardId: r.cardId })),
  };
}
