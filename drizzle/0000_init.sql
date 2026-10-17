CREATE TYPE "public"."buyback_status" AS ENUM('submitted', 'received', 'checking', 'counter_offer', 'approved', 'paid', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."condition" AS ENUM('M', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO');--> statement-breakpoint
CREATE TYPE "public"."credit_reason" AS ENUM('buyback', 'order', 'bonus', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."finish" AS ENUM('normal', 'holo', 'reverse_holo', 'first_edition');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('new', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'returned');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('card', 'bank_transfer', 'cod');--> statement-breakpoint
CREATE TYPE "public"."payout_method" AS ENUM('cash', 'credit');--> statement-breakpoint
CREATE TYPE "public"."rule_scope" AS ENUM('global', 'set', 'card');--> statement-breakpoint
CREATE TYPE "public"."shipping_method" AS ENUM('zasilkovna', 'ceska_posta', 'pickup');--> statement-breakpoint
CREATE TYPE "public"."stock_source" AS ENUM('purchase', 'buyback', 'own');--> statement-breakpoint
CREATE TABLE "buyback_items" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"card_id" text NOT NULL,
	"language" text DEFAULT 'EN' NOT NULL,
	"finish" "finish" DEFAULT 'normal' NOT NULL,
	"quantity" integer NOT NULL,
	"declared_condition" "condition" NOT NULL,
	"checked_condition" "condition",
	"estimate_hal" integer NOT NULL,
	"final_hal" integer
);
--> statement-breakpoint
CREATE TABLE "buyback_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"customer_id" text,
	"email" text NOT NULL,
	"name" text,
	"bank_account" text,
	"payout" "payout_method" NOT NULL,
	"status" "buyback_status" DEFAULT 'submitted' NOT NULL,
	"estimate_hal" integer NOT NULL,
	"offer_hal" integer,
	"estimate_valid_to" timestamp with time zone NOT NULL,
	"is_adult_confirmed" boolean DEFAULT false NOT NULL,
	"bulk_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"received_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	CONSTRAINT "buyback_requests_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"local_id" text NOT NULL,
	"name" text NOT NULL,
	"rarity" text,
	"category" text,
	"types" text[] DEFAULT '{}'::text[] NOT NULL,
	"image_url" text,
	"cardmarket_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"cart_id" text NOT NULL,
	"stock_item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "cart_items_cart_id_stock_item_id_pk" PRIMARY KEY("cart_id","stock_item_id")
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"password_hash" text,
	"is_adult" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"day" date PRIMARY KEY NOT NULL,
	"eur_czk" numeric(10, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"stock_item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_hal" integer NOT NULL,
	"title" text NOT NULL,
	"condition" "condition" NOT NULL,
	"language" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"customer_id" text,
	"email" text NOT NULL,
	"phone" text,
	"name" text NOT NULL,
	"address" jsonb,
	"company_id" text,
	"status" "order_status" DEFAULT 'new' NOT NULL,
	"shipping_method" "shipping_method" NOT NULL,
	"shipping_point" jsonb,
	"shipping_hal" integer NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"cod_fee_hal" integer DEFAULT 0 NOT NULL,
	"credit_used_hal" integer DEFAULT 0 NOT NULL,
	"discount_code" text,
	"discount_hal" integer DEFAULT 0 NOT NULL,
	"items_hal" integer NOT NULL,
	"total_hal" integer NOT NULL,
	"payment_ref" text,
	"tracking_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	CONSTRAINT "orders_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"card_id" text NOT NULL,
	"finish" "finish" DEFAULT 'normal' NOT NULL,
	"day" date NOT NULL,
	"trend_eur" numeric(10, 2),
	"avg_eur" numeric(10, 2),
	"low_eur" numeric(10, 2),
	"avg7_eur" numeric(10, 2),
	"avg30_eur" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_snapshots_card_id_finish_day_pk" PRIMARY KEY("card_id","finish","day")
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" "rule_scope" NOT NULL,
	"set_id" text,
	"card_id" text,
	"markup_pct" numeric(5, 2),
	"buyback_cash_pct" numeric(5, 2),
	"buyback_credit_pct" numeric(5, 2),
	"buyback_min_hal" integer,
	"buyback_max_qty" integer,
	"buyback_disabled" boolean,
	"condition_factors" jsonb,
	"language_factors" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_scope_uq" UNIQUE NULLS NOT DISTINCT("scope","set_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"series" text NOT NULL,
	"release_date" date,
	"logo_url" text,
	"card_count" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"language" text DEFAULT 'EN' NOT NULL,
	"condition" "condition" NOT NULL,
	"finish" "finish" DEFAULT 'normal' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"price_hal" integer NOT NULL,
	"price_locked" boolean DEFAULT false NOT NULL,
	"was_price_hal" integer,
	"purchase_hal" integer,
	"source" "stock_source" DEFAULT 'purchase' NOT NULL,
	"buyback_item_id" text,
	"photos" text[] DEFAULT '{}'::text[] NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_items_buyback_item_id_unique" UNIQUE("buyback_item_id")
);
--> statement-breakpoint
CREATE TABLE "store_credit" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"amount_hal" integer NOT NULL,
	"reason" "credit_reason" NOT NULL,
	"buyback_id" text,
	"order_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_credit_buyback_id_unique" UNIQUE("buyback_id")
);
--> statement-breakpoint
CREATE TABLE "watches" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"card_id" text NOT NULL,
	"max_price_hal" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buyback_items" ADD CONSTRAINT "buyback_items_request_id_buyback_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."buyback_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyback_items" ADD CONSTRAINT "buyback_items_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyback_requests" ADD CONSTRAINT "buyback_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_stock_item_id_stock_items_id_fk" FOREIGN KEY ("stock_item_id") REFERENCES "public"."stock_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_stock_item_id_stock_items_id_fk" FOREIGN KEY ("stock_item_id") REFERENCES "public"."stock_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_buyback_item_id_buyback_items_id_fk" FOREIGN KEY ("buyback_item_id") REFERENCES "public"."buyback_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_credit" ADD CONSTRAINT "store_credit_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_credit" ADD CONSTRAINT "store_credit_buyback_id_buyback_requests_id_fk" FOREIGN KEY ("buyback_id") REFERENCES "public"."buyback_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_credit" ADD CONSTRAINT "store_credit_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watches" ADD CONSTRAINT "watches_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watches" ADD CONSTRAINT "watches_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_name_idx" ON "cards" USING btree ("name");--> statement-breakpoint
CREATE INDEX "cards_set_local_idx" ON "cards" USING btree ("set_id","local_id");--> statement-breakpoint
CREATE INDEX "stock_card_idx" ON "stock_items" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "stock_cond_lang_idx" ON "stock_items" USING btree ("condition","language");--> statement-breakpoint
CREATE INDEX "credit_customer_idx" ON "store_credit" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watch_customer_card_idx" ON "watches" USING btree ("customer_id","card_id");