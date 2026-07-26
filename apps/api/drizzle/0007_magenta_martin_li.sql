CREATE TABLE "credit_card_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"card_id" text NOT NULL,
	"wallet_id" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_card_payment" ADD CONSTRAINT "credit_card_payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_payment" ADD CONSTRAINT "credit_card_payment_card_id_credit_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."credit_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_payment" ADD CONSTRAINT "credit_card_payment_wallet_id_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_card_payment_userId_idx" ON "credit_card_payment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_card_payment_cardId_idx" ON "credit_card_payment" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "credit_card_payment_walletId_idx" ON "credit_card_payment" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "credit_card_payment_cardId_date_idx" ON "credit_card_payment" USING btree ("card_id","date");--> statement-breakpoint
CREATE INDEX "credit_card_payment_walletId_date_idx" ON "credit_card_payment" USING btree ("wallet_id","date");