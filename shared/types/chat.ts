import type { FileClientEvent, FileServerEventData, FileRecordRow } from "./file-transfer";
import type { JsonSerialized } from "./json";
import type { message, room } from "~~/server/db/schema/chat";

export type ChatRoom = JsonSerialized<Pick<typeof room.$inferSelect, "id" | "title" | "createdAt"> & {
  operatorName: string | null;
}>;

export const MAX_CHAT_MESSAGE_LENGTH = 10000;

export type ChatMessageRow = typeof message.$inferSelect;
export type ChatMessage = JsonSerialized<ChatMessageRow>;

export type ChatClientEvent
  = | FileClientEvent
    | { type: "message"; id: string; body: string }
    | { type: "ping" };

/** Server values before the WebSocket transport serializes them as JSON. */
export type ChatServerEventData
  = | FileServerEventData
    | { type: "ready"; userId: string; messages: ChatMessageRow[]; files: FileRecordRow[] }
    | { type: "message"; message: ChatMessageRow }
    | { type: "error"; message: string; id?: string; fatal?: boolean }
    | { type: "pong" };

export type ChatServerEvent = JsonSerialized<ChatServerEventData>;
