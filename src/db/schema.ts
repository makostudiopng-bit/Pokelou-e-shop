// PokeLou – databázové schéma (PostgreSQL / Neon).
// Částky v Kč ukládáme v haléřích (integer), aby nevznikaly chyby zaokrouhlení.
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------- Enums ----------

export const CONDITIONS = ["M", "NM", "EX", "GD", "LP", "PL", "PO"] as const;
export type Condition = (typeof CONDITIONS)[number];
export const conditionEnum = pgEnum("condition", CONDITIONS);

export const FINISHES = ["normal", "holo", "reverse_holo", "first_edition"] as const;
export type Finish = (typeof FINISHES)[number];
export const finishEnum = pgEnum("finish", FINISHES);

export const stockSourceEnum = pgEnum("stock_source", ["purchase", "buyback", "own"]);
export const orderStatusEnum = pgEnum("order_status", [
  "new",
  "paid",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);
export const shippingMethodEnum = pgEnum("shipping_method", ["zasilkovna", "ceska_posta", "pickup"]);
export const paymentMethodEnum = pgEnum("payment_method", ["card", "bank_transfer", "cod"]);
export const BUYBACK_STATUSES = [
  "submitted",
  "received",
  "checking",
  "counter_offer",
  "approved",
  "paid",
  "returned",
  "cancelled",
] as const;
export const buybackStatusEnum = pgEnum("buyback_status", BUYBACK_STATUSES);
export const payoutMethodEnum = pgEnum("payout_method", ["cash", "credit"]);
export const creditReasonEnum = pgEnum("credit_reason", ["buyback", "order", "bonus", "adjustment"]);
export const ruleScopeEnum = pgEnum("rule_scope", ["global", "set", "card"]);

// ---------- Katalog (data z TCGdex) ----------

export const sets = pgTable("sets", {
  id: text("id").primaryKey(), // TCGdex id, např. "sv03.5"
  code: text("code"), // tištěný kód, např. "MEW"
  name: text("name").notNull(),
  series: text("series").notNull(),
  releaseDate: date("release_date"),
  logoUrl: text("logo_url"),
  cardCount: integer("card_count"),
  updatedAt: updatedAt(),
});

export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(), // TCGdex id, např. "sv03.5-198"
    setId: text("set_id")
      .notNull()
      .references(() => sets.id),
    localId: text("local_id").notNull(), // číslo v edici
    name: text("name").notNull(),
    rarity: text("rarity"),
    category: text("category"),
    types: text("types").array().notNull().default(sql`'{}'::text[]`),
    imageUrl: text("image_url"),
    cardmarketId: integer("cardmarket_id"),
    updatedAt: updatedAt(),
  },
  (t) => [index("cards_name_idx").on(t.name), index("cards_set_local_idx").on(t.setId, t.localId)],
);

/** Denní snímek tržní ceny z Cardmarketu (EUR) přes TCGdex */
export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    finish: finishEnum("finish").notNull().default("normal"),
    day: date("day").notNull(),
    trendEur: numeric("trend_eur", { precision: 10, scale: 2 }),
    avgEur: numeric("avg_eur", { precision: 10, scale: 2 }),
    lowEur: numeric("low_eur", { precision: 10, scale: 2 }),
    avg7Eur: numeric("avg7_eur", { precision: 10, scale: 2 }),
    avg30Eur: numeric("avg30_eur", { precision: 10, scale: 2 }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.finish, t.day] })],
);

/** Denní kurz ČNB */
export const exchangeRates = pgTable("exchange_rates", {
  day: date("day").primaryKey(),
  eurCzk: numeric("eur_czk", { precision: 10, scale: 4 }).notNull(),
});

// ---------- Zákazníci ----------

export const customers = pgTable("customers", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  isAdult: boolean("is_adult").notNull().default(false),
  createdAt: createdAt(),
});

// ---------- Výkup ----------

export const buybackRequests = pgTable("buyback_requests", {
  id: id(),
  number: text("number").notNull().unique(), // VK-0087
  customerId: text("customer_id").references(() => customers.id),
  email: text("email").notNull(),
  name: text("name"),
  bankAccount: text("bank_account"),
  payout: payoutMethodEnum("payout").notNull(),
  status: buybackStatusEnum("status").notNull().default("submitted"),
  estimateHal: integer("estimate_hal").notNull(),
  offerHal: integer("offer_hal"),
  estimateValidTo: timestamp("estimate_valid_to", { withTimezone: true }).notNull(),
  isAdultConfirmed: boolean("is_adult_confirmed").notNull().default(false),
  bulkCount: integer("bulk_count").notNull().default(0),
  createdAt: createdAt(),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const buybackItems = pgTable("buyback_items", {
  id: id(),
  requestId: text("request_id")
    .notNull()
    .references(() => buybackRequests.id, { onDelete: "cascade" }),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id),
  language: text("language").notNull().default("EN"),
  finish: finishEnum("finish").notNull().default("normal"),
  quantity: integer("quantity").notNull(),
  declaredCondition: conditionEnum("declared_condition").notNull(),
  checkedCondition: conditionEnum("checked_condition"),
  estimateHal: integer("estimate_hal").notNull(), // za všechny kusy při odeslání
  finalHal: integer("final_hal"), // po kontrole
});

// ---------- Sklad ----------

/** Konkrétní kusy na skladě: karta × jazyk × stav × provedení */
export const stockItems = pgTable(
  "stock_items",
  {
    id: id(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id),
    language: text("language").notNull().default("EN"),
    condition: conditionEnum("condition").notNull(),
    finish: finishEnum("finish").notNull().default("normal"),
    quantity: integer("quantity").notNull().default(0),
    reserved: integer("reserved").notNull().default(0), // drženo v košících
    priceHal: integer("price_hal").notNull(),
    priceLocked: boolean("price_locked").notNull().default(false),
    wasPriceHal: integer("was_price_hal"), // pro štítek "Zlevněno"
    purchaseHal: integer("purchase_hal"), // nákupní cena (marže, DPH z marže)
    source: stockSourceEnum("source").notNull().default("purchase"),
    buybackItemId: text("buyback_item_id")
      .unique()
      .references(() => buybackItems.id),
    photos: text("photos").array().notNull().default(sql`'{}'::text[]`),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("stock_card_idx").on(t.cardId),
    index("stock_cond_lang_idx").on(t.condition, t.language),
  ],
);

// ---------- Košík ----------

export const carts = pgTable("carts", {
  id: id(),
  customerId: text("customer_id").references(() => customers.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // rezervace kusů
  createdAt: createdAt(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    stockItemId: text("stock_item_id")
      .notNull()
      .references(() => stockItems.id),
    quantity: integer("quantity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.cartId, t.stockItemId] })],
);

/** Hlídání dostupnosti nebo ceny karty */
export const watches = pgTable(
  "watches",
  {
    id: id(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id),
    maxPriceHal: integer("max_price_hal"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("watch_customer_card_idx").on(t.customerId, t.cardId)],
);

// ---------- Objednávky ----------

export const orders = pgTable("orders", {
  id: id(),
  number: text("number").notNull().unique(), // PL-2026-0142
  customerId: text("customer_id").references(() => customers.id),
  email: text("email").notNull(),
  phone: text("phone"),
  name: text("name").notNull(),
  address: jsonb("address"), // { street, city, zip, country }
  companyId: text("company_id"), // IČO
  status: orderStatusEnum("status").notNull().default("new"),
  shippingMethod: shippingMethodEnum("shipping_method").notNull(),
  shippingPoint: jsonb("shipping_point"), // výdejní místo Zásilkovny
  shippingHal: integer("shipping_hal").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  codFeeHal: integer("cod_fee_hal").notNull().default(0),
  creditUsedHal: integer("credit_used_hal").notNull().default(0),
  discountCode: text("discount_code"),
  discountHal: integer("discount_hal").notNull().default(0),
  itemsHal: integer("items_hal").notNull(),
  totalHal: integer("total_hal").notNull(),
  paymentRef: text("payment_ref"),
  trackingNumber: text("tracking_number"),
  createdAt: createdAt(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
});

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  stockItemId: text("stock_item_id")
    .notNull()
    .references(() => stockItems.id),
  quantity: integer("quantity").notNull(),
  unitHal: integer("unit_hal").notNull(), // cena v době nákupu
  // snapshot pro doklad, i kdyby se karta v katalogu změnila
  title: text("title").notNull(),
  condition: conditionEnum("condition").notNull(),
  language: text("language").notNull(),
});

// ---------- Kredit ----------

/** Pohyby kreditu: kladné = připsáno, záporné = utraceno */
export const storeCredit = pgTable(
  "store_credit",
  {
    id: id(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    amountHal: integer("amount_hal").notNull(),
    reason: creditReasonEnum("reason").notNull(),
    buybackId: text("buyback_id")
      .unique()
      .references(() => buybackRequests.id),
    orderId: text("order_id").references(() => orders.id),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("credit_customer_idx").on(t.customerId)],
);

// ---------- Cenová pravidla ----------

/**
 * Nejkonkrétnější pravidlo vyhrává: card > set > global.
 * Null = převzít hodnotu z obecnějšího pravidla.
 */
export const pricingRules = pgTable(
  "pricing_rules",
  {
    id: id(),
    scope: ruleScopeEnum("scope").notNull(),
    setId: text("set_id").references(() => sets.id),
    cardId: text("card_id").references(() => cards.id),
    markupPct: numeric("markup_pct", { precision: 5, scale: 2 }),
    buybackCashPct: numeric("buyback_cash_pct", { precision: 5, scale: 2 }),
    buybackCreditPct: numeric("buyback_credit_pct", { precision: 5, scale: 2 }),
    buybackMinHal: integer("buyback_min_hal"), // pod touto hodnotou jen bulk
    buybackMaxQty: integer("buyback_max_qty"), // limit kusů na kartu
    buybackDisabled: boolean("buyback_disabled"),
    conditionFactors: jsonb("condition_factors").$type<Partial<Record<Condition, number>>>(),
    languageFactors: jsonb("language_factors").$type<Record<string, number>>(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("rule_scope_uq").on(t.scope, t.setId, t.cardId).nullsNotDistinct()],
);

// ---------- Relace ----------

export const setsRelations = relations(sets, ({ many }) => ({ cards: many(cards) }));
export const cardsRelations = relations(cards, ({ one, many }) => ({
  set: one(sets, { fields: [cards.setId], references: [sets.id] }),
  prices: many(priceSnapshots),
  stock: many(stockItems),
}));
export const priceSnapshotsRelations = relations(priceSnapshots, ({ one }) => ({
  card: one(cards, { fields: [priceSnapshots.cardId], references: [cards.id] }),
}));
export const stockItemsRelations = relations(stockItems, ({ one }) => ({
  card: one(cards, { fields: [stockItems.cardId], references: [cards.id] }),
}));
export const buybackRequestsRelations = relations(buybackRequests, ({ many, one }) => ({
  items: many(buybackItems),
  customer: one(customers, { fields: [buybackRequests.customerId], references: [customers.id] }),
}));
export const buybackItemsRelations = relations(buybackItems, ({ one }) => ({
  request: one(buybackRequests, { fields: [buybackItems.requestId], references: [buybackRequests.id] }),
  card: one(cards, { fields: [buybackItems.cardId], references: [cards.id] }),
}));
export const ordersRelations = relations(orders, ({ many }) => ({ items: many(orderItems) }));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  stockItem: one(stockItems, { fields: [orderItems.stockItemId], references: [stockItems.id] }),
}));
