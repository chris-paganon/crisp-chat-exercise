import type { FileOffer, FileEndStatus } from "~~/shared/types/file-transfer";

export type TransferStatus = "offering" | "offered" | "preparing" | "connecting" | "transferring" | "finishing" | FileEndStatus;
export interface TransferView extends FileOffer {
  direction: "incoming" | "outgoing";
  status: TransferStatus;
  bytes: number;
  createdAt: number;
  message?: string;
}

export function isTransferActive(transfer: TransferView) {
  return !["completed", "declined", "cancelled", "failed"].includes(transfer.status);
}
