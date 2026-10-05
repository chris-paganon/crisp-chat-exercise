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
  clientId: string;
  body: string;
  createdAt: Date;
}

export type ChatClientEvent
  = | { type: "message"; clientId: string; body: string }
    | { type: "ping" };

export type ChatServerEvent
  = | { type: "ready"; userId: string; messages: ChatMessage[] }
    | { type: "message"; message: ChatMessage }
    | { type: "error"; message: string; clientId?: string; fatal?: boolean }
    | { type: "pong" };
