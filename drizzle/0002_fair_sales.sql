CREATE TYPE "public"."fair_payment" AS ENUM('cash', 'card', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."fair_sale_status" AS ENUM('ok', 'conflict', 'cancelled');--> statement-breakpoint
CREATE TABLE "fair_sales" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_id" text NOT NULL,
	"event_name" text NOT NULL,
	"stock_item_id" text,
	"title" text NOT NULL,
	"condition" "condition",
	"language" text,
	"quantity" integer NOT NULL,
	"unit_hal" integer NOT NULL,
	"list_hal" integer,
	"payment" "fair_payment" NOT NULL,
	"status" "fair_sale_status" NOT NULL,
	"sold_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "fair_sales" ADD CONSTRAINT "fair_sales_stock_item_id_stock_items_id_fk" FOREIGN KEY ("stock_item_id") REFERENCES "public"."stock_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fair_sales_sold_idx" ON "fair_sales" USING btree ("sold_at");--> statement-breakpoint
CREATE INDEX "fair_sales_receipt_idx" ON "fair_sales" USING btree ("receipt_id");