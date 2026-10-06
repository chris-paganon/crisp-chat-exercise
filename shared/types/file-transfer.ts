import type { fileTransfer } from "~~/server/db/schema/chat";
import type { JsonSerialized } from "./json";

export interface FileOffer {
  id: string;
  name: string;
  size: number;
  mime: string;
  fingerprint?: string;
}

export type FileEndStatus = "completed" | "declined" | "cancelled" | "failed";
export type FileLifecycle = "offered" | "accepted" | "interrupted" | FileEndStatus;

export const isFileTerminal = (status: string) => ["completed", "declined", "cancelled", "failed"].includes(status);
export const MAX_CONCURRENT_TRANSFERS = 3;

export type FileRecordRow = typeof fileTransfer.$inferSelect;
export type FileRecord = JsonSerialized<FileRecordRow>;

export type FileSignal
  = | { description: { type: "offer" | "answer"; sdp: string } }
    | { candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null } | null };

/** Commands either participant can send, subject to server lifecycle validation. */
export type FileCommonClientEvent
  = | { type: "file-resume"; id: string; offset: number }
    | { type: "file-cancel"; id: string }
    | { type: "file-pause"; id: string; attempt?: string }
    | { type: "file-fail"; id: string; attempt?: string; message: string }
    | { type: "file-signal"; id: string; attempt: string; signal: FileSignal };

export type FileSenderEvent
  = | FileCommonClientEvent
    | ({ type: "file-offer" } & FileOffer);

export type FileReceiverEvent
  = | FileCommonClientEvent
    | { type: "file-accept"; id: string; offset: number }
    | { type: "file-decline"; id: string }
    | { type: "file-finish"; id: string; attempt?: string };

export type FileClientEvent = FileSenderEvent | FileReceiverEvent;

/** Server values before the WebSocket transport serializes them as JSON. */
export type FileServerEventData
  = | { type: "file-record"; record: FileRecordRow }
    | { type: "file-start"; id: string; offset: number; attempt: string }
    | { type: "file-waiting" | "file-wake"; id: string }
    | { type: "file-error"; id: string; message: string; attempt?: string }
    | { type: "file-signal"; id: string; attempt: string; signal: FileSignal };

export type FileServerEvent = JsonSerialized<FileServerEventData>;
