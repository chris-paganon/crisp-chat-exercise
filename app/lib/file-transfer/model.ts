import type { FileOffer, FileEndStatus, FileLifecycle } from "~~/shared/types/file-transfer";

export type TransferStatus = "verifying" | "waiting-connection" | "waiting" | "offering" | "offered" | "preparing" | "connecting" | "transferring" | "finishing" | "interrupted" | FileEndStatus;
export interface TransferView extends FileOffer {
  direction: "incoming" | "outgoing";
  status: TransferStatus;
  bytes: number;
  createdAt: number;
  message?: string;
  version?: number;
  available?: boolean;
  controlPending?: boolean;
  localBytes?: number;
  hasLocalFile?: boolean;
  expired?: boolean;
  needsSource?: boolean;
  persistedStatus?: FileLifecycle;
}

export function isTransferActive(transfer: TransferView) {
  return !["completed", "declined", "cancelled", "failed", "interrupted"].includes(transfer.status);
}

export function transferPercentage(transfer: TransferView) {
  return transfer.size
    ? Math.min(100, Math.floor(transfer.bytes / transfer.size * 100))
    : transfer.status === "completed" ? 100 : 0;
}

export interface TransferSummary {
  label: string;
  failed: boolean;
}

/** A compact status for the inbox and the closed visitor widget. */
export function summarizeTransfers(transfers: TransferView[]): TransferSummary | undefined {
  const active = transfers.find(isTransferActive);
  if (active) {
    let label: string;
    switch (active.status) {
      case "verifying":
        label = "Verifying file…";
        break;
      case "waiting":
        label = "Waiting to resume or for a transfer slot…";
        break;
      case "waiting-connection":
        label = "Waiting for connection…";
        break;
      case "offering":
        label = "Offering file…";
        break;
      case "offered":
        label = active.direction === "incoming" ? "File offer waiting for you" : "Waiting for file acceptance…";
        break;
      case "preparing":
        label = "Preparing file storage…";
        break;
      case "connecting":
        label = "Connecting file transfer…";
        break;
      case "transferring":
        label = `${active.direction === "incoming" ? "Receiving" : "Sending"} ${transferPercentage(active)}%`;
        break;
      default:
        label = "Confirming receipt…";
    }

    const count = transfers.filter(isTransferActive).length;
    return { label: count > 1 ? `${count} files active · ${label}` : label, failed: false };
  }

  const downloads = transfers.filter(item => item.direction === "incoming" && item.status === "completed" && item.available);
  if (downloads.length) {
    return { label: downloads.length === 1 ? "File ready to download" : `${downloads.length} files ready to download`, failed: false };
  }

  if (transfers.some(item => item.status === "interrupted")) {
    return { label: "File transfer interrupted · open to resume", failed: false };
  }

  if (transfers.at(-1)?.status === "failed") {
    return { label: "File transfer failed", failed: true };
  }
}
