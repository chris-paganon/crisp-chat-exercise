import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Fixed participant slots enforce the two-person room model.
export const room = pgTable("chat_room", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  operatorId: text("operator_id").references(() => user.id, { onDelete: "restrict" }),
  visitorId: text("visitor_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("chat_room_operator_idx").on(table.operatorId),
  uniqueIndex("chat_room_visitor_idx").on(table.visitorId),
  check("chat_room_distinct_participants", sql`${table.operatorId} <> ${table.visitorId}`),
]);

// The client-generated primary key makes message retries idempotent.
export const message = pgTable("chat_message", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => room.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
}, table => [
  index("chat_message_history_idx").on(table.roomId, table.createdAt),
  check("chat_message_body_length", sql`char_length(${table.body}) BETWEEN 1 AND 10000`),
]);
