// A single unacknowledged batch bounds both transport buffers and queued writes.
export const CHUNK_BYTES = 16 * 1024;
export const BATCH_BYTES = 256 * 1024;
export const TRANSFER_TIMEOUT_MS = 30000;

export type FileControl
  = | { type: "batch" | "ack"; offset: number }
    | { type: "end" | "received" };

export function readFileControl(data: string): FileControl {
  if (data.length > 256) throw new Error("Invalid transfer control message.");
  const value = JSON.parse(data);
  if (value?.type === "end" || value?.type === "received") return { type: value.type };
  if ((value?.type === "batch" || value?.type === "ack") && Number.isSafeInteger(value.offset) && value.offset >= 0) {
    return { type: value.type, offset: value.offset };
  }
  throw new Error("Invalid transfer control message.");
}
