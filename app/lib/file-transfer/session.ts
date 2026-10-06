import type { FileSignal } from "~~/shared/types/file-transfer";
import type { FileSink } from "./storage";
import { asTransferError, createRTCPeer } from "./rtc-peer";
import { createFileSender } from "./sender";
import { createFileReceiver } from "./receiver";
import { TRANSFER_TIMEOUT_MS } from "./protocol";

interface SessionOptions {
  id: string;
  roomId: string;
  offset: number;
  sendSignal: (signal: FileSignal) => void;
  progress: (bytes: number) => void;
  connected: () => void;
  fail: (error: Error) => void;
}

export interface TransferSession {
  receiveSignal: (signal: FileSignal) => void;
  close: () => void;
}

interface SendSessionOptions extends SessionOptions {
  source: File;
  sent: () => void;
}

interface ReceiveSessionOptions extends SessionOptions {
  size: number;
  sink: FileSink;
  complete: (file: File) => void;
}

export function createSendSession(options: SendSessionOptions) {
  return createSession(options);
}

export function createReceiveSession(options: ReceiveSessionOptions): TransferSession {
  const { receiveSignal, close } = createSession(options);
  // Receiving begins with the remote offer; no local negotiation needs starting.
  return { receiveSignal, close };
}

/** Shared WebRTC peer/channel lifecycle with the two file transfer implementations. */
function createSession(options: SendSessionOptions | ReceiveSessionOptions) {
  let stopped = false;
  let awaitingCompletion = false;
  let transportError: Error | undefined;
  let channel: RTCDataChannel | undefined;
  let stopTransfer: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout>;

  function fail(error: unknown) {
    if (stopped || transportError) return;

    if (channel?.readyState === "closing" || channel?.readyState === "closed") {
      awaitServerResult(error);
      return;
    }

    options.fail(asTransferError(error));
  }
  // Keep a 30sec activity timer running. If it expires, the transfer is aborted.
  function activity() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!stopped) {
        options.fail(transportError ?? new Error("File transfer timed out. Please send it again."));
      }
    }, awaitingCompletion ? 120000 : TRANSFER_TIMEOUT_MS);
  }
  function awaitServerResult(error: unknown) {
    if (stopped || transportError) return;

    // Closing WebRTC and delivering file-ended use independent transports.
    // Stop I/O, but let the server's cancellation arrive before reporting failure.
    transportError = asTransferError(error);
    stopTransfer?.();
    activity();
  }
  function progress(bytes: number) {
    activity();
    options.progress(bytes);
  }

  const RTCPeer = createRTCPeer({
    id: options.id,
    roomId: options.roomId,
    sender: "source" in options,
    sendSignal: options.sendSignal,
    fail,
    connectionLost(state) {
      // After end is sent, the receiver can close before file-ended arrives.
      // The activity timer still bounds our wait for the server result.
      if (!awaitingCompletion || state === "failed") {
        awaitServerResult(new Error("Peer connection lost. Send the file again once connected."));
      }
    },
    onRtcDataChannel: setupRtcDataChannel,
  });
  activity();

  function setupRtcDataChannel(current: RTCDataChannel) {
    if (channel) {
      current.close();
      fail(new Error("Unexpected second file channel."));
      return;
    }

    channel = current;
    current.binaryType = "arraybuffer";

    function awaitCompletion() {
      awaitingCompletion = true;
      activity();
    }
    let transfer: ReturnType<typeof createFileSender> | ReturnType<typeof createFileReceiver>;
    let startTransfer: (() => Promise<void>) | undefined;
    if ("source" in options) {
      const sender = createFileSender(current, options.source, progress, () => {
        awaitCompletion();
        options.sent();
      }, options.offset);
      transfer = sender;
      startTransfer = sender.start;
    }
    else {
      transfer = createFileReceiver(current, options.size, options.sink, progress, (file) => {
        awaitCompletion();
        options.complete(file);
      }, fail, options.offset, awaitCompletion);
    }
    stopTransfer = transfer.stop;

    current.onmessage = ({ data }) => {
      try {
        if (stopped || transportError || awaitingCompletion) return;

        transfer.receiveFileChannelMessage(data);
      }
      catch (error) {
        fail(error);
      }
    };

    let opened = false;
    current.onopen = () => {
      if (stopped || transportError || opened) return;

      opened = true;
      activity();
      options.connected();
      void startTransfer?.().catch(fail);
    };

    if (current.readyState === "open") {
      current.onopen(new Event("open"));
    }

    current.onerror = () => {
      awaitServerResult(new Error("File data channel failed."));
    };
    current.onclose = () => {
      if (!awaitingCompletion) {
        awaitServerResult(new Error("File data channel closed before completion."));
      }
    };
  }

  return {
    start: () => { void RTCPeer.start().catch(fail); },
    receiveSignal: RTCPeer.receiveSignal,
    close() {
      stopped = true;
      clearTimeout(timer);
      stopTransfer?.();
      channel?.close();
      RTCPeer.close();
    },
  };
}
