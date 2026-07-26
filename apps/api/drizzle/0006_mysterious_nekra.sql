ALTER TABLE "transaction" ADD COLUMN "installment_plan_id" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "installment_number" integer;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "installment_count" integer;--> statement-breakpoint
CREATE INDEX "transaction_installmentPlanId_idx" ON "transaction" USING btree ("installment_plan_id");