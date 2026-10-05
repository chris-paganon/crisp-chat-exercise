import type { FileClientEvent, FileServerEvent, FileEndStatus, FileSignal } from "~~/shared/types/file-transfer";
import type { TransferView } from "./model";
import type { FileSink } from "./storage";
import type { TransferSession } from "./session";
import { ConnectionUnavailableError } from "../chat-error";
import { isTransferActive } from "./model";
import { asTransferError } from "./peer";
import { createReceiveSession, createSendSession } from "./session";
import { createFileDownload, openFileSink } from "./storage";

interface TransferResources {
  source?: File;
  sink?: FileSink;
  session?: TransferSession;
  file?: File;
  timer?: ReturnType<typeof setTimeout>;
  downloads: (() => void)[];
  lastProgressAt?: number;
}
interface ManagerOptions {
  userId: () => string;
  send: (event: FileClientEvent) => void;
  changed: (transfers: TransferView[]) => void;
}

export function createTransferManager(options: ManagerOptions) {
  const transfers = new Map<string, TransferView>();
  const resources = new Map<string, TransferResources>();
  let disposed = false;

  // Updates a shallow clone of all the TransferViews for the UI
  const publish = () => options.changed([...transfers.values()].map(item => ({ ...item })));

  function update(item: TransferView, patch: Partial<TransferView>) {
    Object.assign(item, patch);
    publish();
  }

  function finish(item: TransferView, status: FileEndStatus, message?: string) {
    const resource = resources.get(item.id)!;
    clearTimeout(resource.timer);
    resource.session?.close();
    resource.session = undefined;
    resource.source = undefined;

    if (status !== "completed") {
      resource.file = undefined;
      void resource.sink?.abort();
      resource.sink = undefined;
    }
    update(item, { status, message });
  }

  function fail(item: TransferView, error: unknown) {
    if (!isTransferActive(item)) return;

    const message = asTransferError(error).message.slice(0, 500);
    try {
      options.send({ type: "file-fail", id: item.id, message });
    }
    catch (error) {
      // The transfer is ending locally even if the peer cannot be notified.
      if (!(error instanceof ConnectionUnavailableError)) throw error;
    }
    finally {
      finish(item, "failed", message);
    }
  }

  function prepareSession(item: TransferView) {
    const resource = resources.get(item.id)!;
    clearTimeout(resource.timer);
    update(item, { status: "connecting" });

    return {
      id: item.id,
      signal: (signal: FileSignal) => options.send({ type: "file-signal", id: item.id, signal }),
      progress(bytes: number) {
        item.bytes = bytes;
        const now = performance.now();
        if (bytes === item.size || now - (resource.lastProgressAt ?? 0) >= 100) {
          resource.lastProgressAt = now;
          publish();
        }
      },
      connected: () => update(item, { status: "transferring" }),
      fail: (error: Error) => fail(item, error),
    };
  }

  function startSending(item: TransferView) {
    const resource = resources.get(item.id)!;
    if (!resource.source) throw new Error("The source file is missing.");

    const session = createSendSession({
      ...prepareSession(item),
      source: resource.source,
      sent: () => update(item, { status: "finishing" }),
    });
    resource.session = session;
    session.start();
  }

  function startReceiving(item: TransferView, sink: FileSink) {
    const resource = resources.get(item.id)!;
    resource.session = createReceiveSession({
      ...prepareSession(item),
      size: item.size,
      sink,
      complete(file) {
        resource.file = file;
        update(item, { status: "finishing" });
        try {
          options.send({ type: "file-finish", id: item.id });
        }
        catch (error) {
          fail(item, error);
        }
      },
    });
  }

  // Sender offers a file to the receiver.
  function offer(file: File) {
    if (disposed || [...transfers.values()].some(isTransferActive)) return;

    const item: TransferView = {
      id: crypto.randomUUID(), name: file.name, size: file.size, mime: file.type,
      direction: "outgoing", status: "offering", bytes: 0, createdAt: Date.now(),
    };
    transfers.set(item.id, item);
    resources.set(item.id, { source: file, downloads: [], timer: setTimeout(() => fail(item, new Error("No confirmation received for the file offer.")), 10000) });
    publish();

    try {
      options.send({ type: "file-offer", id: item.id, name: item.name, size: item.size, mime: item.mime });
    }
    catch (error) {
      fail(item, error);
    }
  }

  async function accept(id: string) {
    const item = transfers.get(id);
    if (!item || item.direction !== "incoming" || item.status !== "offered") return;

    const resource = resources.get(id)!;
    update(item, { status: "preparing" });
    resource.timer = setTimeout(() => fail(item, new Error("Preparing file storage timed out.")), 30000);

    try {
      const sink = await openFileSink(id, item.size);
      if (disposed || transfers.get(id)?.status !== "preparing") {
        await sink.abort();
        return;
      }
      resource.sink = sink;
      // Prepare to receive WebRTC signals before accepting the file offer.
      startReceiving(item, sink);
      options.send({ type: "file-accept", id });
    }
    catch (error) {
      fail(item, error);
    }
  }

  function receiveServerEvent(event: FileServerEvent) {
    if (disposed) return;

    let item = transfers.get(event.id);
    if (event.type === "file-offered") {
      if (event.senderId === options.userId()) {
        if (!item) return;
        if (!isTransferActive(item)) {
          // The offer was cancelled before the server responded with the confirmation.
          try {
            options.send({ type: "file-cancel", id: event.id });
          }
          catch (error) {
            if (!(error instanceof ConnectionUnavailableError)) throw error;
          }
          return;
        }
        clearTimeout(resources.get(item.id)?.timer);
        update(item, { status: "offered" });
      }
      else if (!item) {
        // TODO: should probably be removed once we support multiple file transfers
        // A simultaneous outgoing offer lost the server's room race condition lock.
        for (const pending of transfers.values()) {
          if (isTransferActive(pending)) finish(pending, "failed", "The other participant offered a file first.");
        }
        item = { ...event, direction: "incoming", status: "offered", bytes: 0, createdAt: Date.now() };
        transfers.set(item.id, item);
        resources.set(item.id, { downloads: [] });
        publish();
      }
      return;
    }

    if (!item || !isTransferActive(item)) return;
    switch (event.type) {
      case "file-accepted":
        if (item.direction === "outgoing") {
          try {
            startSending(item);
          }
          catch (error) {
            fail(item, error);
          }
        }
        break;
      case "file-signal":
        resources.get(item.id)?.session?.receiveSignal(event.signal);
        break;
      case "file-ended":
        finish(item, event.status, event.message);
        break;
      case "file-error":
        fail(item, new Error(event.message));
        break;
    }
  }

  function stop(id: string, type: "file-cancel" | "file-decline") {
    const item = transfers.get(id);
    if (!item || !isTransferActive(item)) return;

    try {
      options.send({ type, id });
    }
    catch (error) {
      if (!(error instanceof ConnectionUnavailableError)) throw error;
    }
    finally {
      finish(item, type === "file-cancel" ? "cancelled" : "declined");
    }
  }

  function download(id: string) {
    const item = transfers.get(id);
    const resource = resources.get(id);
    if (item?.status === "completed" && resource?.file) {
      resource.downloads.push(createFileDownload(resource.file, item.name));
    }
  }

  function remove(id: string) {
    const item = transfers.get(id);
    if (!item || isTransferActive(item)) return;
    const resource = resources.get(id);
    if (!resource) return;

    resource.downloads.forEach(revoke => revoke());
    void resource.sink?.remove();
    resources.delete(id);
    transfers.delete(id);
    publish();
  }

  function disconnect() {
    for (const item of transfers.values()) {
      if (isTransferActive(item)) {
        try {
          options.send({ type: "file-cancel", id: item.id });
        }
        catch (error) {
          if (!(error instanceof ConnectionUnavailableError)) throw error;
        }
        finally {
          finish(item, "failed", "Chat connection lost. Reconnect and send the file again.");
        }
      }
    }
  }

  function dispose() {
    try {
      for (const item of transfers.values()) {
        if (isTransferActive(item)) stop(item.id, "file-cancel");
      }
    }
    finally {
      disposed = true;
      for (const item of transfers.values()) remove(item.id);
    }
  }

  return { offer, accept, receiveServerEvent, stop, download, remove, disconnect, dispose };
}
