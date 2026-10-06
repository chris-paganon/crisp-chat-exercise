import type { SessionOptions } from "./session";
import { createTransportSession } from "./session";
import { createFileSender } from "./data-sender";

interface SendSessionOptions extends SessionOptions {
  source: File;
  sent: () => void;
}

/** The sender creates the channel and begins reading once it opens. */
export function createSendSession(options: SendSessionOptions) {
  return createTransportSession({
    ...options,
    initiator: true,
    createChannelTransfer(channel, lifecycle) {
      function sent() {
        lifecycle.awaitCompletion();
        options.sent();
      }

      return createFileSender({
        channel,
        file: options.source,
        startOffset: options.offset,
        onProgress: lifecycle.progress,
        onSent: sent,
      });
    },
  });
}
