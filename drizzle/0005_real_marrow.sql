CREATE TYPE "public"."message_status" AS ENUM('sent', 'delivered', 'read');--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "status" "message_status" DEFAULT 'sent';