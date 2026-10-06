import type { FileClientEvent, FileServerEvent, FileRecord } from "./file-transfer";
import type { message } from "~~/server/db/schema/chat";

export interface ChatRoom {
  id: string;
  title: string;
  createdAt: string;
  operatorName: string | null;
}

export const MAX_CHAT_MESSAGE_LENGTH = 10000;

export type ChatMessage = typeof message.$inferSelect;

export type ChatClientEvent
  = | FileClientEvent
    | { type: "message"; id: string; body: string }
    | { type: "ping" };

export type ChatServerEvent
  = | FileServerEvent
    | { type: "ready"; userId: string; messages: ChatMessage[]; files: FileRecord[] }
    | { type: "message"; message: ChatMessage }
    | { type: "error"; message: string; id?: string; fatal?: boolean }
    | { type: "pong" };
