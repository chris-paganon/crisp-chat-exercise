export interface ChatRoom {
  id: string;
  title: string;
  createdAt: string;
  operatorName: string | null;
}

export const MAX_CHAT_MESSAGE_LENGTH = 10000;

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
  createdAt: Date;
}

export type ChatClientEvent
  = | { type: "message"; id: string; body: string }
    | { type: "ping" };

export type ChatServerEvent
  = | { type: "ready"; userId: string; messages: ChatMessage[] }
    | { type: "message"; message: ChatMessage }
    | { type: "error"; message: string; id?: string; fatal?: boolean }
    | { type: "pong" };
