ALTER TYPE "public"."arena_asset" ADD VALUE 'MIX';--> statement-breakpoint
ALTER TABLE "arena_picks" ADD COLUMN "initial_side" "side";--> statement-breakpoint
ALTER TABLE "arena_picks" ADD COLUMN "initial_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "arena_picks" ADD COLUMN "initial_transaction_hash" text;--> statement-breakpoint
ALTER TABLE "arena_picks" ADD COLUMN "changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "arena_rounds" ADD COLUMN "asset" "arena_asset" DEFAULT 'BTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "arena_rounds" ADD COLUMN "market_expires_at" timestamp with time zone;