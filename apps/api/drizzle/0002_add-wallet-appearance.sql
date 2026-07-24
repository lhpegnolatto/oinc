ALTER TABLE "wallet" ADD COLUMN "color" text DEFAULT '#71717a' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet" ADD COLUMN "icon" text DEFAULT 'wallet' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet" ALTER COLUMN "color" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "wallet" ALTER COLUMN "icon" DROP DEFAULT;