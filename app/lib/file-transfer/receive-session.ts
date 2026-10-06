import type { SessionOptions, TransferSession } from "./session";
import type { FileSink } from "./storage";
import { createTransportSession } from "./session";
import { createFileReceiver } from "./receiver";

interface ReceiveSessionOptions extends SessionOptions {
  size: number;
  sink: FileSink;
  complete: (file: File) => void;
}

/** Receiving begins with the remote offer; no local negotiation needs starting. */
export function createReceiveSession(options: ReceiveSessionOptions): TransferSession {
  const { receiveSignal, close } = createTransportSession({
    ...options,
    initiator: false,
    createChannelTransfer(channel, lifecycle) {
      function complete(file: File) {
        lifecycle.awaitCompletion();
        options.complete(file);
      }

      return createFileReceiver({
        channel,
        size: options.size,
        sink: options.sink,
        startOffset: options.offset,
        onProgress: lifecycle.progress,
        onFinishing: lifecycle.awaitCompletion,
        onComplete: complete,
        onError: lifecycle.fail,
      });
    },
  });

  return { receiveSignal, close };
}
