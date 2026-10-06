import type { FileSink } from "./storage";
import { BATCH_BYTES, CHUNK_BYTES, readFileControl } from "./protocol";

interface FileReceiverOptions {
  channel: RTCDataChannel;
  size: number;
  sink: FileSink;
  startOffset?: number;
  onProgress: (bytes: number) => void;
  onFinishing?: () => void;
  onComplete: (file: File) => void;
  onError: (error: unknown) => void;
}

export function createFileReceiver(options: FileReceiverOptions) {
  const { channel, size, sink, startOffset = 0 } = options;

  if (!Number.isSafeInteger(startOffset) || startOffset < 0 || startOffset > size) {
    throw new Error("Invalid receiving offset.");
  }

  let written = startOffset;
  let pendingBytes = 0;
  let pendingMessages = 0;
  let ended = false;
  let stopped = false;
  let writing = Promise.resolve();

  function receiveFileChannelMessage(data: unknown) {
    if (stopped) return;

    const bytes = data instanceof ArrayBuffer ? data.byteLength : 0;
    if ((typeof data !== "string" && !(data instanceof ArrayBuffer))
      || bytes > CHUNK_BYTES || pendingBytes + bytes > BATCH_BYTES || pendingMessages >= 64) {
      throw new Error("Invalid or excessive incoming file data.");
    }

    pendingBytes += bytes;
    pendingMessages++;

    // Keep an async queue of bytes to write. Each byte is processed in order.
    writing = writing.then(async () => {
      if (stopped) return;
      if (ended && data instanceof ArrayBuffer) {
        throw new Error("File data received after completion.");
      }

      if (data instanceof ArrayBuffer) {
        if (!bytes || written + bytes > size) {
          throw new Error("Received file exceeds its advertised size.");
        }
        await sink.write(data);
        if (stopped) return;

        written += bytes;
        options.onProgress(written);
      }
      else {
        const control = readFileControl(data as string);
        if (ended) {
          throw new Error("File data received after completion.");
        }
        else if (control.type === "batch" && control.offset === written) {
          await sink.checkpoint?.();
          if (stopped) return;

          channel.send(JSON.stringify({ type: "ack", offset: written }));
        }
        else if (control.type === "end" && written === size) {
          ended = true;
          options.onFinishing?.();
          const file = await sink.finish();
          if (stopped) return;

          if (file.size !== size) {
            throw new Error("Received file size does not match the offer.");
          }
          options.onComplete(file);
        }
        else {
          throw new Error("Incomplete file or invalid transfer control message.");
        }
      }
    }).catch((error) => {
      if (!stopped) {
        options.onError(error);
      }
    }).finally(() => {
      pendingBytes -= bytes;
      pendingMessages--;
    });
  }

  return {
    receiveFileChannelMessage,
    stop() {
      stopped = true;
    },
  };
}
