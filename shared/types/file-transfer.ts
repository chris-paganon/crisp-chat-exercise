import type { fileTransfer } from "~~/server/db/schema/chat";

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

export type FileRecord = typeof fileTransfer.$inferSelect;

export type FileSignal
  = | { description: { type: "offer" | "answer"; sdp: string } }
    | { candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null } | null };

export type FileClientEvent
  = | ({ type: "file-offer" } & FileOffer)
    | { type: "file-accept" | "file-resume"; id: string; offset: number }
    | { type: "file-decline" | "file-cancel"; id: string }
    | { type: "file-pause" | "file-finish"; id: string; attempt?: string }
    | { type: "file-fail"; id: string; attempt?: string; message: string }
    | { type: "file-signal"; id: string; attempt: string; signal: FileSignal };

export type FileServerEvent
  = | { type: "file-record"; record: FileRecord }
    | { type: "file-start"; id: string; offset: number; attempt: string }
    | { type: "file-waiting" | "file-wake"; id: string }
    | { type: "file-error"; id: string; message: string; attempt?: string }
    | { type: "file-signal"; id: string; attempt: string; signal: FileSignal };
