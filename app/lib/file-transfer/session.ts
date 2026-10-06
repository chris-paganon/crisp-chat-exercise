import type { FileSignal } from "~~/shared/types/file-transfer";
import type { FileSink } from "./storage";
import { asTransferError, createRTCPeer } from "./rtc-peer";
import { createFileSender } from "./data-sender";
import { createFileReceiver } from "./data-receiver";
import { TRANSFER_TIMEOUT_MS } from "./protocol";

export interface SessionOptions {
  id: string;
  roomId: string;
  offset: number;
  sendSignal: (signal: FileSignal) => void;
  progress: (bytes: number) => void;
  connected: () => void;
  fail: (error: Error) => void;
}

export interface TransferSession {
  start?: () => void;
  receiveSignal: (signal: FileSignal) => void;
  close: () => void;
}

interface ChannelTransfer {
  receiveFileChannelMessage: (data: unknown) => void;
  stop: () => void;
  start?: () => Promise<void>;
}

interface OutgoingSessionOptions extends SessionOptions {
  direction: "outgoing";
  source: File;
  sent: () => void;
}

interface IncomingSessionOptions extends SessionOptions {
  direction: "incoming";
  size: number;
  sink: FileSink;
  complete: (file: File) => void;
}

/** Shared connection lifecycle with explicit sending or receiving channel setup. */
export function createTransferSession(options: OutgoingSessionOptions | IncomingSessionOptions): TransferSession {
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

    // Closing WebRTC and delivering file-record use independent transports.
    // Stop I/O, but let the server's cancellation arrive before reporting failure.
    transportError = asTransferError(error);
    stopTransfer?.();
    activity();
  }

  function progress(bytes: number) {
    activity();
    options.progress(bytes);
  }

  function awaitCompletion() {
    awaitingCompletion = true;
    activity();
  }

  const RTCPeer = createRTCPeer({
    id: options.id,
    roomId: options.roomId,
    initiator: options.direction === "outgoing",
    sendSignal: options.sendSignal,
    fail,
    connectionLost(state) {
      // After end is sent, the receiver can close before file-record arrives.
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

    let transfer: ChannelTransfer;
    if (options.direction === "outgoing") {
      const { source, sent } = options;

      function notifySent() {
        awaitCompletion();
        sent();
      }

      transfer = createFileSender({
        channel: current,
        file: source,
        startOffset: options.offset,
        onProgress: progress,
        onSent: notifySent,
      });
    }
    else {
      const { size, sink, complete } = options;

      function notifyComplete(file: File) {
        awaitCompletion();
        complete(file);
      }

      transfer = createFileReceiver({
        channel: current,
        size,
        sink,
        startOffset: options.offset,
        onProgress: progress,
        onFinishing: awaitCompletion,
        onComplete: notifyComplete,
        onError: fail,
      });
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
      void transfer.start?.().catch(fail);
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

  function start() {
    void RTCPeer.start().catch(fail);
  }

  return {
    start: options.direction === "outgoing" ? start : undefined,
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
