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
    createChannelTransfer(channel, { progress, awaitCompletion, fail }) {
      return createFileReceiver(channel, options.size, options.sink, progress, (file) => {
        awaitCompletion();
        options.complete(file);
      }, fail, options.offset, awaitCompletion);
    },
  });

  return { receiveSignal, close };
}
