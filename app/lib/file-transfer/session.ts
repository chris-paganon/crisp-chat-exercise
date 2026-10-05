import type { FileSignal } from "~~/shared/types/file-transfer";
import type { FileSink } from "./storage";
import { asTransferError, createFilePeer } from "./peer";
import { createFileSender } from "./sender";
import { createFileReceiver } from "./receiver";
import { TRANSFER_TIMEOUT_MS } from "./protocol";

interface SessionOptions {
  id: string;
  signal: (signal: FileSignal) => void;
  progress: (bytes: number) => void;
  connected: () => void;
  fail: (error: Error) => void;
}

interface SendSessionOptions extends SessionOptions {
  source: File;
  delivered: () => void;
}

interface ReceiveSessionOptions extends SessionOptions {
  size: number;
  sink: FileSink;
  complete: (file: File) => void;
}

interface TransferCallbacks {
  progress: (bytes: number) => void;
  delivered: () => void;
  fail: (error: unknown) => void;
}

interface ChannelTransfer {
  receiveFileChannelMessage: (data: unknown) => void;
  start?: () => Promise<void>;
  stop: () => void;
}

interface ConnectionOptions extends SessionOptions {
  sender: boolean;
  createTransfer: (channel: RTCDataChannel, callbacks: TransferCallbacks) => ChannelTransfer;
}

export function createSendSession(options: SendSessionOptions) {
  return createSessionConnection({
    ...options,
    sender: true,
    createTransfer(channel, callbacks) {
      return createFileSender(channel, options.source, callbacks.progress, () => {
        callbacks.delivered();
        options.delivered();
      });
    },
  });
}

export function createReceiveSession(options: ReceiveSessionOptions) {
  return createSessionConnection({
    ...options,
    sender: false,
    createTransfer(channel, callbacks) {
      return createFileReceiver(channel, options.size, options.sink, callbacks.progress, (file) => {
        if (file.size !== options.size) throw new Error("Received file size does not match the offer.");
        callbacks.delivered();
        options.complete(file);
      }, callbacks.fail);
    },
  });
}

/** Shared peer/channel lifecycle; file protocol handling belongs to each session. */
function createSessionConnection(options: ConnectionOptions) {
  let stopped = false;
  let delivered = false;
  let channel: RTCDataChannel | undefined;
  let transfer: ChannelTransfer | undefined;
  let timer: ReturnType<typeof setTimeout>;

  function fail(error: unknown) {
    if (!stopped) options.fail(asTransferError(error));
  }
  // Keep a 30sec activity timer running. If it expires, the transfer is aborted.
  function activity() {
    clearTimeout(timer);
    timer = setTimeout(() => fail(new Error("File transfer timed out. Please send it again.")), TRANSFER_TIMEOUT_MS);
  }
  function progress(bytes: number) {
    activity();
    options.progress(bytes);
  }

  const peer = createFilePeer({
    id: options.id,
    sender: options.sender,
    signal: options.signal,
    fail: (error) => { if (!delivered) fail(error); },
    channel: channelHandler,
  });
  activity();

  function channelHandler(current: RTCDataChannel) {
    if (channel) {
      current.close();
      fail(new Error("Unexpected second file channel."));
      return;
    }

    channel = current;
    current.binaryType = "arraybuffer";

    transfer = options.createTransfer(current, {
      progress,
      delivered() {
        delivered = true;
        activity();
      },
      fail,
    });
    const currentTransfer = transfer;

    current.onmessage = ({ data }) => {
      try {
        if (stopped || delivered) return;

        currentTransfer.receiveFileChannelMessage(data);
      }
      catch (error) {
        fail(error);
      }
    };

    let opened = false;
    current.onopen = () => {
      if (stopped || opened) return;

      opened = true;
      activity();
      options.connected();
      void currentTransfer.start?.().catch(fail);
    };

    if (current.readyState === "open") {
      current.onopen(new Event("open"));
    }

    current.onerror = () => {
      if (!delivered) fail(new Error("File data channel failed."));
    };
    current.onclose = () => {
      if (!delivered) fail(new Error("File data channel closed before completion."));
    };
  }

  return {
    start: () => { void peer.start().catch(fail); },
    receiveSignal: peer.receiveSignal,
    close() {
      stopped = true;
      clearTimeout(timer);
      transfer?.stop();
      channel?.close();
      peer.close();
    },
  };
}
