import { BATCH_BYTES, CHUNK_BYTES, readFileControl, TRANSFER_TIMEOUT_MS } from "./protocol";

/** Stop-and-wait batches: an ACK means bytes were written, not merely received. */
export function createFileSender(channel: RTCDataChannel, file: File, progress: (bytes: number) => void, complete: () => void = () => {}) {
  let offset = 0;
  let stopped = false;
  let endSent = false;
  let acknowledge: (() => void) | undefined;
  let rejectWait: ((error: Error) => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function receive(data: unknown) {
    if (stopped) return;
    if (typeof data !== "string") throw new Error("Unexpected file data at sender.");
    const control = readFileControl(data);
    if (control.type === "received" && endSent) {
      complete();
      return;
    }
    if (control.type !== "ack" || control.offset !== offset || !acknowledge) {
      throw new Error("Invalid file acknowledgement.");
    }
    progress(control.offset);
    clearTimeout(timer);
    const resolve = acknowledge;
    acknowledge = undefined;
    rejectWait = undefined;
    resolve();
  }

  async function start() {
    while (offset < file.size) {
      const batchEnd = Math.min(offset + BATCH_BYTES, file.size);
      while (offset < batchEnd) {
        const next = Math.min(offset + CHUNK_BYTES, batchEnd);
        const chunk = await file.slice(offset, next).arrayBuffer();
        if (stopped) return;
        if (chunk.byteLength !== next - offset) throw new Error("The source file could not be read.");
        channel.send(chunk);
        offset = next;
      }
      if (stopped) return;
      await new Promise<void>((resolve, reject) => {
        acknowledge = resolve;
        rejectWait = reject;
        timer = setTimeout(() => reject(new Error("The receiver stopped responding.")), TRANSFER_TIMEOUT_MS);
        channel.send(JSON.stringify({ type: "batch", offset }));
      });
    }
    if (!stopped) {
      endSent = true;
      channel.send(JSON.stringify({ type: "end" }));
    }
  }

  return {
    start,
    receive,
    stop() {
      stopped = true;
      clearTimeout(timer);
      rejectWait?.(new Error("Transfer stopped."));
      acknowledge = undefined;
      rejectWait = undefined;
    },
  };
}
