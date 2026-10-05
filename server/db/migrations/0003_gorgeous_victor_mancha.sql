ALTER TABLE "chat_invite" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "chat_invite" CASCADE;--> statement-breakpoint
-- Remove legacy invitation-only rooms, which have no visitor conversation to retain.
DELETE FROM "chat_room" WHERE "visitor_id" IS NULL;--> statement-breakpoint
ALTER TABLE "chat_room" ALTER COLUMN "visitor_id" SET NOT NULL;
