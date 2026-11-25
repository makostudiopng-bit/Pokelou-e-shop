CREATE TYPE "public"."email_status" AS ENUM('sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"dedupe_key" text,
	"status" "email_status" NOT NULL,
	"provider_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_log_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "buyback_requests" ADD COLUMN "locale" text DEFAULT 'cs' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "locale" text DEFAULT 'cs' NOT NULL;--> statement-breakpoint
ALTER TABLE "watches" ADD COLUMN "locale" text DEFAULT 'cs' NOT NULL;--> statement-breakpoint
ALTER TABLE "watches" ADD COLUMN "token" text DEFAULT gen_random_uuid()::text NOT NULL;--> statement-breakpoint
ALTER TABLE "watches" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "watches" ADD COLUMN "notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "watches" ADD COLUMN "notified_hal" integer;--> statement-breakpoint
CREATE INDEX "email_log_to_idx" ON "email_log" USING btree ("to","created_at");--> statement-breakpoint
ALTER TABLE "watches" ADD CONSTRAINT "watches_token_unique" UNIQUE("token");