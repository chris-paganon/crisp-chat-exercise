export interface FileOffer {
  id: string;
  name: string;
  size: number;
  mime: string;
}

export type FileSignal
  = | { description: { type: "offer" | "answer"; sdp: string } }
    | { candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null } | null };

export type FileClientEvent
  = | ({ type: "file-offer" } & FileOffer)
    | { type: "file-accept" | "file-decline" | "file-cancel" | "file-finish"; id: string }
    | { type: "file-fail"; id: string; message: string }
    | { type: "file-signal"; id: string; signal: FileSignal };

export type FileEndStatus = "completed" | "declined" | "cancelled" | "failed";

export type FileServerEvent
  = | ({ type: "file-offered"; senderId: string } & FileOffer)
    | { type: "file-accepted"; id: string }
    | { type: "file-ended"; id: string; status: FileEndStatus; message?: string }
    | { type: "file-error"; id: string; message: string }
    | { type: "file-signal"; id: string; signal: FileSignal };
