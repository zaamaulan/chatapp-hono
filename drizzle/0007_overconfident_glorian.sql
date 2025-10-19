ALTER TABLE "conversation" ADD COLUMN "last_message_content" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "last_message_sender_id" uuid;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_last_message_sender_id_user_id_fk" FOREIGN KEY ("last_message_sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;