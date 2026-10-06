import type { SessionOptions } from "./session";
import { createTransportSession } from "./session";
import { createFileSender } from "./sender";

interface SendSessionOptions extends SessionOptions {
  source: File;
  sent: () => void;
}

/** The sender creates the channel and begins reading once it opens. */
export function createSendSession(options: SendSessionOptions) {
  return createTransportSession({
    ...options,
    initiator: true,
    createChannelTransfer(channel, { progress, awaitCompletion }) {
      return createFileSender(channel, options.source, progress, () => {
        awaitCompletion();
        options.sent();
      }, options.offset);
    },
  });
}
