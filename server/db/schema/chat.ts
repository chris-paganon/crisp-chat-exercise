import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Fixed participant slots enforce the two-person room model.
export const room = pgTable("chat_room", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  operatorId: text("operator_id").references(() => user.id, { onDelete: "restrict" }),
  visitorId: text("visitor_id").references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  index("chat_room_operator_idx").on(table.operatorId),
  uniqueIndex("chat_room_visitor_idx").on(table.visitorId),
  check("chat_room_distinct_participants", sql`${table.operatorId} <> ${table.visitorId}`),
]);

export const invite = pgTable("chat_invite", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => room.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex("chat_invite_room_idx").on(table.roomId),
  uniqueIndex("chat_invite_token_idx").on(table.tokenHash),
]);

// Text history is ready for the next phase; no message write endpoint exists yet.
export const message = pgTable("chat_message", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => room.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  clientId: text("client_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
}, table => [
  index("chat_message_history_idx").on(table.roomId, table.createdAt),
  uniqueIndex("chat_message_client_idx").on(table.roomId, table.senderId, table.clientId),
  check("chat_message_body_length", sql`char_length(${table.body}) BETWEEN 1 AND 10000`),
]);
