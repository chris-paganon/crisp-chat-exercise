DROP INDEX "chat_room_visitor_idx";--> statement-breakpoint
ALTER TABLE "chat_room" ALTER COLUMN "operator_id" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_room_visitor_idx" ON "chat_room" USING btree ("visitor_id");