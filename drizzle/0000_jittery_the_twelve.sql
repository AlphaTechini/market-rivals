CREATE TYPE "public"."arena_access_type" AS ENUM('PRIVATE', 'PUBLIC');--> statement-breakpoint
CREATE TYPE "public"."arena_asset" AS ENUM('BTC', 'ETH');--> statement-breakpoint
CREATE TYPE "public"."arena_status" AS ENUM('JOINING', 'LIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."pick_status" AS ENUM('PENDING', 'CONFIRMED', 'REJECTED', 'MISSED');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('SCHEDULED', 'TRADING', 'LOCKED', 'SETTLED', 'MISSED');--> statement-breakpoint
CREATE TYPE "public"."side" AS ENUM('UP', 'DOWN');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"arena_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arena_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_score" numeric(20, 8) DEFAULT '0' NOT NULL,
	"correct_rounds" integer DEFAULT 0 NOT NULL,
	"missed_rounds" integer DEFAULT 0 NOT NULL,
	"total_testnet_pnl" numeric(20, 8) DEFAULT '0' NOT NULL,
	"final_rank" integer
);
--> statement-breakpoint
CREATE TABLE "arena_picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"selected_side" "side" NOT NULL,
	"order_transaction_hash" text,
	"average_fill_price" numeric(38, 18),
	"filled_quantity" numeric(38, 18),
	"actual_cost" numeric(38, 18),
	"settlement_value" numeric(38, 18),
	"round_score" numeric(20, 8),
	"actual_testnet_pnl" numeric(38, 18),
	"submitted_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"status" "pick_status" DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arena_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arena_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"dreamdex_market_id" text,
	"market_symbol" text,
	"opening_price" numeric(38, 18),
	"closing_price" numeric(38, 18),
	"opens_at" timestamp with time zone NOT NULL,
	"locks_at" timestamp with time zone NOT NULL,
	"settles_at" timestamp with time zone,
	"winning_side" "side",
	"status" "round_status" DEFAULT 'SCHEDULED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arenas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"host_profile_id" uuid NOT NULL,
	"asset" "arena_asset" NOT NULL,
	"access_type" "arena_access_type" NOT NULL,
	"invite_code" text NOT NULL,
	"status" "arena_status" DEFAULT 'JOINING' NOT NULL,
	"round_count" integer NOT NULL,
	"contract_quantity" integer DEFAULT 10 NOT NULL,
	"maximum_participants" integer NOT NULL,
	"round_interval_minutes" integer NOT NULL,
	"entry_fee" numeric(20, 8) NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_challenges" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"nonce" text NOT NULL,
	"message" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_participant_id_arena_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."arena_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_participants" ADD CONSTRAINT "arena_participants_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_participants" ADD CONSTRAINT "arena_participants_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_picks" ADD CONSTRAINT "arena_picks_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_picks" ADD CONSTRAINT "arena_picks_round_id_arena_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."arena_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_picks" ADD CONSTRAINT "arena_picks_participant_id_arena_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."arena_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arena_rounds" ADD CONSTRAINT "arena_rounds_arena_id_arenas_id_fk" FOREIGN KEY ("arena_id") REFERENCES "public"."arenas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arenas" ADD CONSTRAINT "arenas_host_profile_id_profiles_id_fk" FOREIGN KEY ("host_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "achievements_participant_arena_type_idx" ON "achievements" USING btree ("participant_id","arena_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "arena_participants_arena_profile_idx" ON "arena_participants" USING btree ("arena_id","profile_id");--> statement-breakpoint
CREATE INDEX "arena_participants_arena_score_idx" ON "arena_participants" USING btree ("arena_id","total_score");--> statement-breakpoint
CREATE UNIQUE INDEX "arena_picks_round_participant_idx" ON "arena_picks" USING btree ("round_id","participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "arena_picks_transaction_hash_idx" ON "arena_picks" USING btree ("order_transaction_hash");--> statement-breakpoint
CREATE INDEX "arena_picks_wallet_idx" ON "arena_picks" USING btree ("wallet_address");--> statement-breakpoint
CREATE UNIQUE INDEX "arena_rounds_arena_number_idx" ON "arena_rounds" USING btree ("arena_id","round_number");--> statement-breakpoint
CREATE INDEX "arena_rounds_market_id_idx" ON "arena_rounds" USING btree ("dreamdex_market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "arenas_invite_code_idx" ON "arenas" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "arenas_status_asset_idx" ON "arenas" USING btree ("status","asset");--> statement-breakpoint
CREATE INDEX "arenas_start_at_idx" ON "arenas" USING btree ("start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_idx" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_wallet_address_idx" ON "profiles" USING btree ("wallet_address");