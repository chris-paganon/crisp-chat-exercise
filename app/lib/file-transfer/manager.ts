import type { FileClientEvent, FileServerEvent, FileSignal, FileRecord } from "~~/shared/types/file-transfer";
import { isFileTerminal } from "~~/shared/types/file-transfer";
import { nowTimestamp } from "~~/shared/utils/date";
import type { TransferView } from "./model";
import type { TransferSession } from "./session";
import type { ResumableFileSink } from "./resumable-storage";
import { ConnectionUnavailableError } from "../chat-error";
import { asTransferError } from "./rtc-peer";
import { createReceiveSession, createSendSession } from "./session";
import { createFileDownload } from "./storage";
import { fingerprintFile } from "./fingerprint";
import { readCheckpoint, isCheckpointExpired, readLocalControl, saveLocalControl, deleteLocalControl } from "./recovery";
import { getLocalFile, openResumableFileSink, removeLocalFile, touchLocalFile } from "./resumable-storage";

interface TransferResources {
  source?: File;
  sink?: ResumableFileSink;
  session?: TransferSession;
  file?: File;
  attempt?: string;
  ready: boolean;
  preparing: boolean;
  pendingOffer?: boolean;
  offerSent?: boolean;
  generation: number;
  closing: Promise<void>;
  pendingControl?: "file-cancel" | "file-decline";
  controlSaving?: Promise<void>;
  mobileConsent?: boolean;
  downloads: (() => void)[];
  lastProgressAt?: number;
}
interface ManagerOptions {
  roomId: string;
  userId: () => string;
  connected: () => boolean;
  send: (event: FileClientEvent) => void;
  changed: (transfers: TransferView[]) => void;
}

// Source verification is serialized across rooms to bound hashing memory.
let verification = Promise.resolve();

export function createTransferManager(options: ManagerOptions) {
  const transfers = new Map<string, TransferView>();
  const resources = new Map<string, TransferResources>();
  let disposed = false;
  let historyReady = false;
  let hydrationGeneration = 0;
  const key = (id: string) => ({ userId: options.userId(), roomId: options.roomId, id });
  const publish = () => options.changed([...transfers.values()].map(item => ({ ...item })));

  function resourceFor(id: string) {
    let resource = resources.get(id);
    if (!resource) {
      resource = { downloads: [], ready: false, preparing: false, generation: 0, closing: Promise.resolve() };
      resources.set(id, resource);
    }
    return resource;
  }

  function update(item: TransferView, patch: Partial<TransferView>) {
    Object.assign(item, patch);
    publish();
  }

  function send(event: FileClientEvent) {
    try {
      options.send(event);
      return true;
    }
    catch (error) {
      if (!(error instanceof ConnectionUnavailableError)) {
        throw error;
      }
      return false;
    }
  }

  function closeResources(item: TransferView) {
    const resource = resourceFor(item.id);
    resource.generation++;
    resource.session?.close();
    resource.session = undefined;
    resource.attempt = undefined;
    resource.ready = false;
    resource.preparing = false;
    resource.pendingOffer = false;
    const sink = resource.sink;
    resource.sink = undefined;
    resource.closing = resource.closing.then(() => sink?.pause()).catch((error) => {
      update(item, { message: asTransferError(error).message });
    });
  }

  function interrupt(item: TransferView, message: string, notify = true) {
    if (isFileTerminal(item.status)) return;

    const attempt = resourceFor(item.id).attempt;
    closeResources(item);
    update(item, { status: "interrupted", message, needsSource: item.direction === "outgoing" && !resourceFor(item.id).source });
    if (notify) {
      send({ type: "file-pause", id: item.id, attempt });
    }
  }

  function finish(item: TransferView, record: FileRecord) {
    const resource = resourceFor(item.id);
    const hadLocalFile = Boolean(resource.sink || resource.file || item.localBytes);
    closeResources(item);
    resource.source = undefined;
    resource.pendingControl = undefined;
    void clearControl(item);
    update(item, {
      controlPending: false,
      status: record.status as TransferView["status"], message: record.message ?? undefined,
      bytes: record.status === "completed" ? record.size : item.bytes, needsSource: false,
    });
    if (record.status !== "completed" && item.direction === "incoming" && hadLocalFile) {
      resource.file = undefined;
      void resource.closing.then(() => removeLocalFile(key(item.id))).then(() => {
        update(item, { available: false, localBytes: 0, hasLocalFile: false, expired: false });
      }).catch(error => update(item, { message: `Cannot remove local file: ${asTransferError(error).message}` }));
    }
  }

  function fail(item: TransferView, error: unknown) {
    // Transport and storage failures retain recovery data; cancellation is explicit.
    interrupt(item, asTransferError(error).message.slice(0, 500));
  }

  async function inspectLocal(item: TransferView) {
    if (item.direction !== "incoming") return;

    const resource = resourceFor(item.id);
    const generation = resource.generation;
    try {
      const saved = await readCheckpoint(key(item.id));
      const file = await getLocalFile(key(item.id), item.fingerprint ?? "", item.size);
      if (disposed || resource.generation !== generation) return;

      resource.file = file;
      update(item, {
        localBytes: saved?.bytes ?? 0, available: Boolean(file), hasLocalFile: Boolean(saved),
        expired: saved ? isCheckpointExpired(saved) : false,
        bytes: resource.session || item.status === "completed" ? item.bytes : saved?.bytes ?? item.bytes,
      });
      if (file && !isFileTerminal(item.status) && item.persistedStatus !== "offered" && options.connected()) {
        send({ type: "file-finish", id: item.id });
      }
    }
    catch (error) {
      update(item, { message: asTransferError(error).message });
    }
  }

  function restore(record: FileRecord) {
    if (disposed || record.roomId !== options.roomId) return;

    let item = transfers.get(record.id);
    if (item && (item.version ?? -1) >= record.version) return;

    const fresh = !item;
    if (!item) {
      item = {
        ...record, direction: record.senderId === options.userId() ? "outgoing" : "incoming",
        bytes: record.status === "completed" ? record.size : 0,
        status: record.status === "accepted" ? "interrupted" : record.status, message: record.message ?? undefined,
      };
      transfers.set(item.id, item);
    }
    const resource = resourceFor(item.id);
    resource.pendingOffer = false;
    item.createdAt = record.createdAt;
    item.version = record.version;
    item.persistedStatus = record.status;
    item.fingerprint = record.fingerprint;
    if (resource.pendingControl && !isFileTerminal(record.status)) {
      update(item, { status: resource.pendingControl === "file-cancel" ? "cancelled" : "declined", controlPending: true });
      return;
    }

    if (isFileTerminal(record.status)) {
      finish(item, record);
    }
    else if (record.status === "interrupted") {
      interrupt(item, record.message ?? "Transfer interrupted. Resume when both sides are ready.", false);
    }
    else if (record.status === "offered") {
      if (resource.session || (resource.ready && record.message)) {
        closeResources(item);
      }
      update(item, { status: "offered", message: record.message ?? undefined, needsSource: item.direction === "outgoing" && !resource.source });
    }
    else if (!resource.session && !resource.preparing && !resource.ready) {
      update(item, { status: "interrupted", needsSource: item.direction === "outgoing" && !resource.source });
    }
    if (fresh || isFileTerminal(record.status)) {
      void inspectLocal(item);
    }
    publish();
  }

  function mobilePermission(resource: TransferResources) {
    if (resource.mobileConsent) return true;

    const network = (navigator as Navigator & { connection?: { type?: string } }).connection;
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
    if ((network?.type === "cellular" || (mobile && !network?.type))
      && !window.confirm("Transfer this large file? Your connection may use mobile data and incur charges.")) {
      return false;
    }
    resource.mobileConsent = true;
    return true;
  }

  async function verifySource(item: TransferView, file: File, resource: TransferResources) {
    const generation = resource.generation;
    update(item, { status: "verifying", message: undefined });
    const operation = verification.then(() => fingerprintFile(file, () => disposed || resource.generation !== generation));
    verification = operation.then(() => {}, () => {});
    const fingerprint = await operation;
    if (disposed || resource.generation !== generation) return false;
    if (item.fingerprint && (item.fingerprint !== fingerprint || file.size !== item.size)) {
      throw new Error("Choose the original file. The selected file's contents do not match this transfer.");
    }
    item.fingerprint = fingerprint;
    resource.source = file;
    item.needsSource = false;
    return true;
  }

  async function offer(file: File) {
    if (disposed) return;

    const item: TransferView = {
      id: crypto.randomUUID(), name: file.name, size: file.size, mime: file.type,
      direction: "outgoing", status: "verifying", bytes: 0, createdAt: nowTimestamp(),
    };
    const resource = resourceFor(item.id);
    if (!mobilePermission(resource)) return;

    transfers.set(item.id, item);
    publish();
    resource.source = file;
    resource.preparing = true;
    resource.pendingOffer = true;
    const generation = resource.generation;
    try {
      if (!await verifySource(item, file, resource)) return;
      resource.preparing = false;
      sendOffer(item);
    }
    catch (error) {
      if (resource.generation === generation) {
        resource.preparing = false;
        if (!isFileTerminal(item.status)) {
          fail(item, error);
        }
      }
    }
  }

  function waitForConnection(item: TransferView) {
    resourceFor(item.id).ready = false;
    update(item, { status: "waiting-connection", message: undefined });
  }

  function sendOffer(item: TransferView) {
    const resource = resourceFor(item.id);
    if (disposed || resource.preparing || resource.ready || !resource.pendingOffer || !item.fingerprint) return;

    if (!historyReady || !options.connected()) {
      waitForConnection(item);
      return;
    }

    update(item, { status: "offering", message: undefined });
    resource.ready = send({ type: "file-offer", id: item.id, name: item.name, size: item.size, mime: item.mime, fingerprint: item.fingerprint });
    if (resource.ready) {
      resource.offerSent = true;
    }
    else {
      waitForConnection(item);
    }
  }

  async function resume(id: string, file?: File, automatic = false) {
    const item = transfers.get(id);
    if (!item || disposed || isFileTerminal(item.status)) return;

    const resource = resourceFor(id);
    if (resource.preparing || resource.ready || resource.session || resource.pendingControl) return;
    if (item.direction === "incoming" && item.persistedStatus === "offered" && automatic) return;
    if (item.direction === "outgoing" && !file && !resource.source) {
      update(item, { status: "interrupted", needsSource: true, message: "Reselect the original file to resume." });
      return;
    }
    if (!historyReady || !options.connected()) {
      update(item, { message: "Reconnect to resume this transfer." });
      return;
    }
    resource.preparing = true;
    resource.pendingOffer = item.direction === "outgoing" && item.persistedStatus === undefined;
    const generation = resource.generation;
    update(item, { status: "preparing", message: undefined });
    try {
      const saved = item.direction === "incoming" ? await readCheckpoint(key(id)) : undefined;
      if (automatic && item.direction === "incoming" && !saved) return;
      if (automatic && saved && isCheckpointExpired(saved)) {
        update(item, { status: "interrupted", expired: true, message: "The saved partial expired after seven days. Restart receiving to continue." });
        return;
      }
      if (!mobilePermission(resource)) return;

      await resource.closing;
      if (disposed || resource.generation !== generation) return;

      if (item.direction === "outgoing") {
        if ((file || !item.fingerprint) && !await verifySource(item, file ?? resource.source!, resource)) return;
        if (resource.pendingOffer) {
          resource.preparing = false;
          sendOffer(item);
          return;
        }
        else {
          resource.ready = send({ type: "file-resume", id, offset: 0 });
        }
      }
      else {
        if (!item.fingerprint) {
          throw new Error("This older file offer cannot be resumed. Ask the sender to offer it again.");
        }

        if (saved && isCheckpointExpired(saved)) {
          // Expiration reclaims data only on an explicit restart, never during history loading.
          await removeLocalFile(key(id));
          if (disposed || resource.generation !== generation) return;

          update(item, { bytes: 0, localBytes: 0, hasLocalFile: false, expired: false });
        }
        const completed = await getLocalFile(key(id), item.fingerprint, item.size);
        if (completed && item.persistedStatus !== "offered") {
          resource.file = completed;
          item.available = true;
          update(item, { status: "finishing", available: true, hasLocalFile: true });
          send({ type: "file-finish", id });
          return;
        }
        const sink = await openResumableFileSink(key(id), item.size, item.fingerprint);
        if (disposed || resource.generation !== generation) {
          await sink.pause();
          return;
        }
        resource.sink = sink;
        item.bytes = sink.offset;
        item.localBytes = sink.offset;
        item.hasLocalFile = true;
        resource.ready = send({ type: item.persistedStatus === "offered" ? "file-accept" : "file-resume", id, offset: sink.offset });
      }
      if (disposed || resource.generation !== generation) return;

      if (!resource.ready) {
        interrupt(item, "Reconnect to resume this transfer.", false);
      }
      else {
        update(item, { status: "waiting", message: undefined });
      }
    }
    catch (error) {
      if (resource.generation === generation && !isFileTerminal(item.status)) {
        fail(item, error);
      }
    }
    finally {
      if (resource.generation === generation) {
        resource.preparing = false;
        if (!resource.ready && item.status === "preparing") {
          update(item, { status: item.persistedStatus === "offered" ? "offered" : "interrupted" });
        }
      }
    }
  }

  function start(item: TransferView, event: Extract<FileServerEvent, { type: "file-start" }>) {
    const resource = resourceFor(item.id);
    if (resource.session || isFileTerminal(item.status) || !resource.ready) return;
    if (event.offset > item.size) return fail(item, new Error("Invalid resume position."));

    resource.attempt = event.attempt;
    update(item, { status: "connecting", bytes: event.offset, message: undefined });
    const generation = resource.generation;
    const current = () => !disposed && resource.generation === generation && resource.attempt === event.attempt;
    const shared = {
      id: item.id, roomId: options.roomId, offset: event.offset,
      sendSignal(signal: FileSignal) {
        if (current() && !send({ type: "file-signal", id: item.id, attempt: event.attempt, signal })) {
          throw new ConnectionUnavailableError();
        }
      },
      progress(bytes: number) {
        if (!current()) return;

        item.bytes = bytes;
        const now = performance.now();
        if (bytes === item.size || now - (resource.lastProgressAt ?? 0) >= 100) {
          resource.lastProgressAt = now;
          publish();
        }
      },
      connected() {
        if (!current()) return;

        update(item, { status: "transferring" });
      },
      fail(error: Error) {
        if (!current()) return;

        fail(item, error);
      },
    };
    try {
      if (item.direction === "outgoing") {
        if (!resource.source) {
          throw new Error("Reselect the original file to resume.");
        }

        const session = createSendSession({ ...shared, source: resource.source, sent: () => {
          if (current()) {
            update(item, { status: "finishing" });
          }
        } });
        resource.session = session;
        session.start();
      }
      else {
        if (!resource.sink || resource.sink.offset !== event.offset) {
          throw new Error("The receiving checkpoint does not match.");
        }

        resource.session = createReceiveSession({ ...shared, size: item.size, sink: resource.sink, complete(file) {
          if (!current()) return;

          resource.file = file;
          update(item, { status: "finishing", available: true, localBytes: item.size, hasLocalFile: true, expired: false });
          if (!send({ type: "file-finish", id: item.id, attempt: event.attempt })) {
            interrupt(item, "File received. Reconnect to confirm receipt.", false);
          }
        } });
      }
    }
    catch (error) {
      fail(item, error);
    }
  }

  function receiveServerEvent(event: FileServerEvent) {
    if (disposed) return;
    if (event.type === "file-record") {
      restore(event.record);
      return;
    }
    const item = transfers.get(event.id);
    if (!item) return;

    const resource = resourceFor(item.id);
    if (isFileTerminal(item.status) && !resource.pendingControl) return;

    switch (event.type) {
      case "file-start":
        start(item, event);
        break;
      case "file-signal":
        if (event.attempt === resource.attempt) {
          resource.session?.receiveSignal(event.signal);
        }
        break;
      case "file-wake":
        void resume(item.id, undefined, true);
        break;
      case "file-waiting":
        if (resource.ready) {
          update(item, { status: "waiting" });
        }
        break;
      case "file-error":
        if (resource.pendingControl) {
          resource.pendingControl = undefined;
          void clearControl(item);
          update(item, { status: item.persistedStatus === "offered" ? "offered" : "interrupted", controlPending: false, message: event.message });
          break;
        }
        if (!event.attempt || event.attempt === resource.attempt) {
          interrupt(item, event.message, false);
        }
        break;
    }
  }

  async function clearControl(item: TransferView) {
    const resource = resourceFor(item.id);
    await resource.controlSaving;
    try {
      await deleteLocalControl(key(item.id));
    }
    catch (error) {
      if (!disposed) {
        update(item, { message: asTransferError(error).message });
      }
    }
  }

  async function hydrate(records: FileRecord[]) {
    const generation = ++hydrationGeneration;
    historyReady = false;
    for (const record of records) {
      if (disposed || generation !== hydrationGeneration) return;

      try {
        const command = await readLocalControl(key(record.id));
        if (disposed || generation !== hydrationGeneration) return;

        resourceFor(record.id).pendingControl = isFileTerminal(record.status) ? undefined : command;
        if (command && isFileTerminal(record.status)) {
          await deleteLocalControl(key(record.id));
        }
      }
      catch {
        // DB history remains readable if local browser storage is unavailable.
      }
      if (disposed || generation !== hydrationGeneration) return;

      restore(record);
    }
    if (disposed || generation !== hydrationGeneration || !options.connected()) return;

    historyReady = true;
    connected();
  }

  function connected() {
    for (const item of transfers.values()) {
      const resource = resourceFor(item.id);
      if (resource.pendingControl) {
        void (resource.controlSaving ?? Promise.resolve()).then(() => {
          if (resource.pendingControl) {
            send({ type: resource.pendingControl, id: item.id });
          }
        });
      }
      else if (resource.pendingOffer) {
        sendOffer(item);
      }
      else if (!isFileTerminal(item.status)) {
        void resume(item.id, undefined, true);
      }
      else if (item.status === "completed") {
        void inspectLocal(item);
      }
    }
  }

  function stop(id: string, type: "file-cancel" | "file-decline") {
    const item = transfers.get(id);
    if (!item || isFileTerminal(item.status)) return;

    const resource = resourceFor(id);
    // A file that has never been offered has no server record to cancel.
    if (item.persistedStatus === undefined && !resource.offerSent) {
      closeResources(item);
      resource.source = undefined;
      update(item, { status: type === "file-cancel" ? "cancelled" : "declined", needsSource: false });
      return;
    }

    resource.pendingControl = type;
    closeResources(item);
    resource.source = undefined;
    update(item, { status: type === "file-cancel" ? "cancelled" : "declined", needsSource: false, controlPending: true });
    resource.controlSaving = saveLocalControl(key(id), type).catch((error) => {
      update(item, { message: `Cannot save pending cancellation: ${asTransferError(error).message}` });
    });
    void resource.controlSaving.then(() => {
      if (resource.pendingControl === type) {
        send({ type, id });
      }
    });
    if (item.direction === "incoming") {
      void remove(id);
    }
  }

  async function download(id: string) {
    const item = transfers.get(id);
    if (!item || item.status !== "completed") return;

    const resource = resourceFor(id);
    try {
      const file = await getLocalFile(key(id), item.fingerprint ?? "", item.size);
      if (!file) {
        await inspectLocal(item);
        update(item, { available: false, message: "The local file expired or is no longer available in this browser." });
        return;
      }
      await touchLocalFile(key(id));
      resource.downloads.push(createFileDownload(file, item.name));
    }
    catch (error) {
      update(item, { message: asTransferError(error).message });
    }
  }

  async function remove(id: string) {
    const item = transfers.get(id);
    if (!item || (!isFileTerminal(item.status) && item.status !== "interrupted")) return;

    const resource = resourceFor(id);
    try {
      await resource.closing;
      await removeLocalFile(key(id));
      resource.downloads.forEach(revoke => revoke());
      resource.downloads = [];
      resource.file = undefined;
      update(item, { available: false, localBytes: 0, hasLocalFile: false, expired: false, bytes: item.status === "completed" ? item.size : 0, message: undefined });
    }
    catch (error) {
      update(item, { message: `Cannot remove local file: ${asTransferError(error).message}` });
    }
  }

  function disconnect() {
    historyReady = false;
    hydrationGeneration++;
    for (const item of transfers.values()) {
      if (!isFileTerminal(item.status)) {
        const resource = resourceFor(item.id);
        if (resource.pendingOffer) {
          // Socket loss must not cancel local hashing or discard the selected File.
          resource.ready = false;
          if (!resource.preparing) {
            waitForConnection(item);
          }
        }
        else {
          interrupt(item, "Connection interrupted. Your saved progress is kept.");
        }
      }
    }
  }

  function dispose() {
    disconnect();
    disposed = true;
    for (const resource of resources.values()) {
      resource.downloads.forEach(revoke => revoke());
      resource.source = undefined;
    }
  }

  return { hydrate, restore, connected, offer, accept: resume, resume, receiveServerEvent, stop, download, remove, disconnect, dispose };
}
