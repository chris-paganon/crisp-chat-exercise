CREATE TABLE "chat_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"client_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "chat_message_body_length" CHECK (char_length("chat_message"."body") BETWEEN 1 AND 10000)
);
--> statement-breakpoint
CREATE TABLE "chat_room" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"operator_id" text NOT NULL,
	"visitor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_room_distinct_participants" CHECK ("chat_room"."operator_id" <> "chat_room"."visitor_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_anonymous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_invite" ADD CONSTRAINT "chat_invite_room_id_chat_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_room_id_chat_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_room" ADD CONSTRAINT "chat_room_operator_id_user_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_room" ADD CONSTRAINT "chat_room_visitor_id_user_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_invite_room_idx" ON "chat_invite" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_invite_token_idx" ON "chat_invite" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "chat_message_history_idx" ON "chat_message" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_message_client_idx" ON "chat_message" USING btree ("room_id","sender_id","client_id");--> statement-breakpoint
CREATE INDEX "chat_room_operator_idx" ON "chat_room" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "chat_room_visitor_idx" ON "chat_room" USING btree ("visitor_id");