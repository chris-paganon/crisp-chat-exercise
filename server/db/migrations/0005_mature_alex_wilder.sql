CREATE TABLE "chat_file_transfer" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"name" text NOT NULL,
	"size" bigint NOT NULL,
	"mime" text NOT NULL,
	"fingerprint" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'offered' NOT NULL,
	"message" text,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_file_transfer_distinct_participants" CHECK ("chat_file_transfer"."sender_id" <> "chat_file_transfer"."receiver_id"),
	CONSTRAINT "chat_file_transfer_size" CHECK ("chat_file_transfer"."size" >= 0 AND "chat_file_transfer"."size" <= 9007199254740991),
	CONSTRAINT "chat_file_transfer_status" CHECK ("chat_file_transfer"."status" IN ('offered', 'accepted', 'interrupted', 'completed', 'declined', 'cancelled', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "chat_file_transfer" ADD CONSTRAINT "chat_file_transfer_room_id_chat_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_file_transfer" ADD CONSTRAINT "chat_file_transfer_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_file_transfer" ADD CONSTRAINT "chat_file_transfer_receiver_id_user_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_file_transfer_history_idx" ON "chat_file_transfer" USING btree ("room_id","created_at");