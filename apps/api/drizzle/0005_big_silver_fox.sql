CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'posted');--> statement-breakpoint
CREATE TABLE "credit_card" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"balance" numeric(14, 2) NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"statement_close_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction" ALTER COLUMN "wallet_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "card_id" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "status" "transaction_status";--> statement-breakpoint
ALTER TABLE "credit_card" ADD CONSTRAINT "credit_card_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_card_userId_idx" ON "credit_card" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_card_id_credit_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."credit_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transaction_cardId_idx" ON "transaction" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "transaction_cardId_date_idx" ON "transaction" USING btree ("card_id","date");--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_exactly_one_destination" CHECK (("transaction"."wallet_id" IS NOT NULL) <> ("transaction"."card_id" IS NOT NULL));