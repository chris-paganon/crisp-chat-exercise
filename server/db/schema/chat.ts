import type { FileLifecycle } from "~~/shared/types/file-transfer";
import { sql } from "drizzle-orm";
import { bigint, check, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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

// File bytes stay P2P; one durable row also serves as the file's chat-history entry.
export const fileTransfer = pgTable("chat_file_transfer", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => room.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  receiverId: text("receiver_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  mime: text("mime").notNull(),
  fingerprint: text("fingerprint").notNull().default(""),
  status: text("status").$type<FileLifecycle>().notNull().default("offered"),
  message: text("message"),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("chat_file_transfer_history_idx").on(table.roomId, table.createdAt),
  check("chat_file_transfer_distinct_participants", sql`${table.senderId} <> ${table.receiverId}`),
  check("chat_file_transfer_size", sql`${table.size} >= 0 AND ${table.size} <= 9007199254740991`),
  check("chat_file_transfer_status", sql`${table.status} IN ('offered', 'accepted', 'interrupted', 'completed', 'declined', 'cancelled', 'failed')`),
]);
