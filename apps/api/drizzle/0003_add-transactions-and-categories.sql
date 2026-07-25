CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_id" text NOT NULL,
	"category_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_wallet_id_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_userId_idx" ON "category" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_walletId_idx" ON "transaction" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "transaction_categoryId_idx" ON "transaction" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "transaction_userId_idx" ON "transaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_walletId_date_idx" ON "transaction" USING btree ("wallet_id","date");--> statement-breakpoint
-- Fixed system category seed (userId NULL => visible to every user, not
-- editable/deletable by any user — see modules/categories). Stable ids +
-- ON CONFLICT DO NOTHING keep this idempotent across environments/reruns.
INSERT INTO "category" ("id", "user_id", "name", "type", "color", "icon") VALUES
	('system-food', NULL, 'Food & Dining', 'expense', '#f97316', 'utensils'),
	('system-transport', NULL, 'Transport', 'expense', '#06b6d4', 'car'),
	('system-housing', NULL, 'Housing', 'expense', '#8b5cf6', 'house'),
	('system-health', NULL, 'Health', 'expense', '#ef4444', 'heart-pulse'),
	('system-shopping', NULL, 'Shopping', 'expense', '#d946ef', 'shopping-bag'),
	('system-entertainment', NULL, 'Entertainment', 'expense', '#ec4899', 'film'),
	('system-education', NULL, 'Education', 'expense', '#3b82f6', 'graduation-cap'),
	('system-bills', NULL, 'Bills & Utilities', 'expense', '#71717a', 'receipt'),
	('system-travel', NULL, 'Travel', 'expense', '#14b8a6', 'plane'),
	('system-other-expense', NULL, 'Other', 'expense', '#f59e0b', 'wrench'),
	('system-salary', NULL, 'Salary', 'income', '#22c55e', 'banknote'),
	('system-investments', NULL, 'Investments', 'income', '#14b8a6', 'trending-up'),
	('system-gifts', NULL, 'Gifts', 'income', '#ec4899', 'gift'),
	('system-other-income', NULL, 'Other Income', 'income', '#84cc16', 'hand-coins')
ON CONFLICT ("id") DO NOTHING;