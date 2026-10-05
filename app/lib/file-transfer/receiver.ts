import type { FileSink } from "./storage";
import { BATCH_BYTES, CHUNK_BYTES, readFileControl } from "./protocol";

export function createFileReceiver(
  channel: RTCDataChannel,
  size: number,
  sink: FileSink,
  progress: (bytes: number) => void,
  complete: (file: File) => void,
  fail: (error: unknown) => void,
) {
  let written = 0;
  let pendingBytes = 0;
  let pendingMessages = 0;
  let ended = false;
  let stopped = false;
  let writing = Promise.resolve();

  function receive(data: unknown) {
    if (stopped) return;
    const bytes = data instanceof ArrayBuffer ? data.byteLength : 0;
    if ((typeof data !== "string" && !(data instanceof ArrayBuffer))
      || bytes > CHUNK_BYTES || pendingBytes + bytes > BATCH_BYTES || pendingMessages >= 64) {
      throw new Error("Invalid or excessive incoming file data.");
    }
    pendingBytes += bytes;
    pendingMessages++;
    writing = writing.then(async () => {
      if (stopped) return;
      if (ended) throw new Error("File data received after completion.");
      if (data instanceof ArrayBuffer) {
        if (!bytes || written + bytes > size) throw new Error("Received file exceeds its advertised size.");
        await sink.write(data);
        if (stopped) return;
        written += bytes;
        progress(written);
      }
      else {
        const control = readFileControl(data as string);
        if (control.type === "batch" && control.offset === written) {
          channel.send(JSON.stringify({ type: "ack", offset: written }));
        }
        else if (control.type === "end" && written === size) {
          ended = true;
          const file = await sink.finish();
          if (!stopped) complete(file);
        }
        else {
          throw new Error("Incomplete file or invalid transfer control message.");
        }
      }
    }).catch((error) => {
      if (!stopped) fail(error);
    }).finally(() => {
      pendingBytes -= bytes;
      pendingMessages--;
    });
  }

  return {
    receive,
    stop() {
      stopped = true;
    },
  };
}
