import type { FileSignal } from "~~/shared/types/file-transfer";
import type { FileSink } from "./storage";
import { asTransferError, createFilePeer } from "./peer";
import { createFileSender } from "./sender";
import { createFileReceiver } from "./receiver";
import { TRANSFER_TIMEOUT_MS } from "./protocol";

interface SessionOptions {
  id: string;
  size: number;
  source?: File;
  sink?: FileSink;
  signal: (signal: FileSignal) => void;
  progress: (bytes: number) => void;
  connected: () => void;
  complete: (file: File) => void;
  delivered: () => void;
  fail: (error: Error) => void;
}

/** One peer/channel per transfer; independent of Vue and room socket lifecycle. */
export function createTransferSession(options: SessionOptions) {
  let stopped = false;
  let delivered = false;
  let channel: RTCDataChannel | undefined;
  let sender: ReturnType<typeof createFileSender> | undefined;
  let receiver: ReturnType<typeof createFileReceiver> | undefined;
  let timer: ReturnType<typeof setTimeout>;

  function fail(error: unknown) {
    if (!stopped) options.fail(asTransferError(error));
  }
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
    sender: Boolean(options.source),
    signal: options.signal,
    fail: (error) => { if (!delivered) fail(error); },
    channel(current) {
      if (channel) {
        current.close();
        fail(new Error("Unexpected second file channel."));
        return;
      }
      channel = current;
      current.binaryType = "arraybuffer";
      if (options.source) sender = createFileSender(current, options.source, progress, () => {
        delivered = true;
        activity();
        options.delivered();
      });
      else if (options.sink) receiver = createFileReceiver(current, options.size, options.sink, progress, (file) => {
        if (file.size !== options.size) throw new Error("Received file size does not match the offer.");
        current.send(JSON.stringify({ type: "received" }));
        delivered = true;
        activity();
        options.complete(file);
      }, fail);
      current.onmessage = ({ data }) => {
        try {
          if (!stopped && !delivered) (sender ?? receiver)?.receive(data);
        }
        catch (error) {
          fail(error);
        }
      };
      current.onopen = () => {
        if (stopped) return;
        activity();
        options.connected();
        void sender?.start().catch(fail);
      };
      current.onerror = () => {
        if (!delivered) fail(new Error("File data channel failed."));
      };
      current.onclose = () => {
        if (!delivered) fail(new Error("File data channel closed before completion."));
      };
    },
  });
  activity();
  return {
    start: () => { void peer.start().catch(fail); },
    receive: peer.receive,
    close() {
      stopped = true;
      clearTimeout(timer);
      sender?.stop();
      receiver?.stop();
      channel?.close();
      peer.close();
    },
  };
}
