import type { FileClientEvent, FileServerEvent, FileSignal, FileRecord } from "~~/shared/types/file-transfer";
import { isFileTerminal } from "~~/shared/types/file-transfer";
import type { TransferView } from "./model";
import type { TransferSession } from "./session";
import type { ResumableFileSink } from "./resumable-storage";
import { ConnectionUnavailableError } from "../chat-error";
import { asTransferError } from "./rtc-peer";
import { createReceiveSession, createSendSession } from "./session";
import { createFileDownload } from "./storage";
import { verifyFileFingerprint } from "./fingerprint";
import { readIndexedDbCheckpoint, isCheckpointExpired, saveIndexedDbLocalControl, deleteIndexedDbLocalControl } from "./recovery";
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

interface TransferOptions {
  roomId: string;
  userId: () => string;
  connected: () => boolean;
  historyReady: () => boolean;
  send: (event: FileClientEvent) => void;
  changed: () => void;
}

/** Owns the state, browser resources, and lifecycle of one file transfer. */
export function createTransfer(item: TransferView, options: TransferOptions) {
  const resource: TransferResources = {
    downloads: [], ready: false, preparing: false, generation: 0, closing: Promise.resolve(),
  };
  const { id } = item;
  const key = () => ({ userId: options.userId(), roomId: options.roomId, id });
  const publish = options.changed;
  let disposed = false;

  function update(patch: Partial<TransferView>) {
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

  function closeResources() {
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
      update({ message: asTransferError(error).message });
    });
  }

  function interrupt(message: string, notify = true) {
    if (isFileTerminal(item.status)) return;

    const attempt = resource.attempt;
    closeResources();
    update({ status: "interrupted", message, needsSource: item.direction === "outgoing" && !resource.source });
    if (notify) {
      send({ type: "file-pause", id: item.id, attempt });
    }
  }

  function finish(record: FileRecord) {
    const hadLocalFile = Boolean(resource.sink || resource.file || item.localBytes);
    closeResources();
    resource.source = undefined;
    resource.pendingControl = undefined;
    void clearControl();
    update({
      controlPending: false,
      status: record.status as TransferView["status"], message: record.message ?? undefined,
      bytes: record.status === "completed" ? record.size : item.bytes, needsSource: false,
    });
    if (record.status !== "completed" && item.direction === "incoming" && hadLocalFile) {
      resource.file = undefined;
      void resource.closing.then(() => removeLocalFile(key())).then(() => {
        update({ available: false, localBytes: 0, hasLocalFile: false, expired: false });
      }).catch(error => update({ message: `Cannot remove local file: ${asTransferError(error).message}` }));
    }
  }

  function fail(error: unknown) {
    // Transport and storage failures retain recovery data; cancellation is explicit.
    interrupt(asTransferError(error).message.slice(0, 500));
  }

  async function inspectLocal() {
    if (item.direction !== "incoming") return;

    const generation = resource.generation;
    try {
      const saved = await readIndexedDbCheckpoint(key());
      const file = await getLocalFile(key(), item.fingerprint ?? "", item.size);
      if (disposed || resource.generation !== generation) return;

      resource.file = file;
      update({
        localBytes: saved?.bytes ?? 0, available: Boolean(file), hasLocalFile: Boolean(saved),
        expired: saved ? isCheckpointExpired(saved) : false,
        bytes: resource.session || item.status === "completed" ? item.bytes : saved?.bytes ?? item.bytes,
      });
      if (file && !isFileTerminal(item.status) && item.persistedStatus !== "offered" && options.connected()) {
        send({ type: "file-finish", id: item.id });
      }
    }
    catch (error) {
      update({ message: asTransferError(error).message });
    }
  }

  function restore(record: FileRecord, fresh = false) {
    if (disposed || record.roomId !== options.roomId) return;
    if (!fresh && (item.version ?? -1) >= record.version) return;

    resource.pendingOffer = false;
    item.createdAt = record.createdAt;
    item.version = record.version;
    item.persistedStatus = record.status;
    item.fingerprint = record.fingerprint;
    if (resource.pendingControl && !isFileTerminal(record.status)) {
      update({ status: resource.pendingControl === "file-cancel" ? "cancelled" : "declined", controlPending: true });
      return;
    }

    if (isFileTerminal(record.status)) {
      finish(record);
    }
    else if (record.status === "interrupted") {
      interrupt(record.message ?? "Transfer interrupted. Resume when both sides are ready.", false);
    }
    else if (record.status === "offered") {
      if (resource.session || (resource.ready && record.message)) {
        closeResources();
      }
      update({ status: "offered", message: record.message ?? undefined, needsSource: item.direction === "outgoing" && !resource.source });
    }
    else if (!resource.session && !resource.preparing && !resource.ready) {
      update({ status: "interrupted", needsSource: item.direction === "outgoing" && !resource.source });
    }
    if (fresh || isFileTerminal(record.status)) {
      void inspectLocal();
    }
    publish();
  }

  function mobilePermission() {
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

  async function verifySource(file: File) {
    const generation = resource.generation;
    update({ status: "verifying", message: undefined });
    const fingerprint = await verifyFileFingerprint(file, () => disposed || resource.generation !== generation);
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

    resource.source = file;
    resource.preparing = true;
    resource.pendingOffer = true;
    const generation = resource.generation;
    try {
      if (!await verifySource(file)) return;
      resource.preparing = false;
      sendOffer();
    }
    catch (error) {
      if (resource.generation === generation) {
        resource.preparing = false;
        if (!isFileTerminal(item.status)) {
          fail(error);
        }
      }
    }
  }

  function waitForConnection() {
    resource.ready = false;
    update({ status: "waiting-connection", message: undefined });
  }

  function sendOffer() {
    if (disposed || resource.preparing || resource.ready || !resource.pendingOffer || !item.fingerprint) return;

    if (!options.historyReady() || !options.connected()) {
      waitForConnection();
      return;
    }

    update({ status: "offering", message: undefined });
    resource.ready = send({ type: "file-offer", id: item.id, name: item.name, size: item.size, mime: item.mime, fingerprint: item.fingerprint });
    if (resource.ready) {
      resource.offerSent = true;
    }
    else {
      waitForConnection();
    }
  }

  async function resume(file?: File, automatic = false) {
    if (disposed || isFileTerminal(item.status)) return;

    if (resource.preparing || resource.ready || resource.session || resource.pendingControl) return;
    if (item.direction === "incoming" && item.persistedStatus === "offered" && automatic) return;
    if (item.direction === "outgoing" && !file && !resource.source) {
      update({ status: "interrupted", needsSource: true, message: "Reselect the original file to resume." });
      return;
    }
    if (!options.historyReady() || !options.connected()) {
      update({ message: "Reconnect to resume this transfer." });
      return;
    }
    resource.preparing = true;
    resource.pendingOffer = item.direction === "outgoing" && item.persistedStatus === undefined;
    const generation = resource.generation;
    update({ status: "preparing", message: undefined });
    try {
      const saved = item.direction === "incoming" ? await readIndexedDbCheckpoint(key()) : undefined;
      if (automatic && item.direction === "incoming" && !saved) return;
      if (automatic && saved && isCheckpointExpired(saved)) {
        update({ status: "interrupted", expired: true, message: "The saved partial expired after seven days. Restart receiving to continue." });
        return;
      }
      if (!mobilePermission()) return;

      await resource.closing;
      if (disposed || resource.generation !== generation) return;

      if (item.direction === "outgoing") {
        if ((file || !item.fingerprint) && !await verifySource(file ?? resource.source!)) return;
        if (resource.pendingOffer) {
          resource.preparing = false;
          sendOffer();
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
          await removeLocalFile(key());
          if (disposed || resource.generation !== generation) return;

          update({ bytes: 0, localBytes: 0, hasLocalFile: false, expired: false });
        }
        const completed = await getLocalFile(key(), item.fingerprint, item.size);
        if (completed && item.persistedStatus !== "offered") {
          resource.file = completed;
          item.available = true;
          update({ status: "finishing", available: true, hasLocalFile: true });
          send({ type: "file-finish", id });
          return;
        }
        const sink = await openResumableFileSink(key(), item.size, item.fingerprint);
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
        interrupt("Reconnect to resume this transfer.", false);
      }
      else {
        update({ status: "waiting", message: undefined });
      }
    }
    catch (error) {
      if (resource.generation === generation && !isFileTerminal(item.status)) {
        fail(error);
      }
    }
    finally {
      if (resource.generation === generation) {
        resource.preparing = false;
        if (!resource.ready && item.status === "preparing") {
          update({ status: item.persistedStatus === "offered" ? "offered" : "interrupted" });
        }
      }
    }
  }

  function start(event: Extract<FileServerEvent, { type: "file-start" }>) {
    if (resource.session || isFileTerminal(item.status) || !resource.ready) return;
    if (event.offset > item.size) return fail(new Error("Invalid resume position."));

    resource.attempt = event.attempt;
    update({ status: "connecting", bytes: event.offset, message: undefined });
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

        update({ status: "transferring" });
      },
      fail(error: Error) {
        if (!current()) return;

        fail(error);
      },
    };
    try {
      if (item.direction === "outgoing") {
        if (!resource.source) {
          throw new Error("Reselect the original file to resume.");
        }

        const session = createSendSession({ ...shared, source: resource.source, sent: () => {
          if (current()) {
            update({ status: "finishing" });
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
          update({ status: "finishing", available: true, localBytes: item.size, hasLocalFile: true, expired: false });
          if (!send({ type: "file-finish", id: item.id, attempt: event.attempt })) {
            interrupt("File received. Reconnect to confirm receipt.", false);
          }
        } });
      }
    }
    catch (error) {
      fail(error);
    }
  }

  function receiveServerEvent(event: Exclude<FileServerEvent, { type: "file-record" }>) {
    if (disposed) return;
    if (isFileTerminal(item.status) && !resource.pendingControl) return;

    switch (event.type) {
      case "file-start":
        start(event);
        break;
      case "file-signal":
        if (event.attempt === resource.attempt) {
          resource.session?.receiveSignal(event.signal);
        }
        break;
      case "file-wake":
        void resume(undefined, true);
        break;
      case "file-waiting":
        if (resource.ready) {
          update({ status: "waiting" });
        }
        break;
      case "file-error":
        if (resource.pendingControl) {
          resource.pendingControl = undefined;
          void clearControl();
          update({ status: item.persistedStatus === "offered" ? "offered" : "interrupted", controlPending: false, message: event.message });
          break;
        }
        if (!event.attempt || event.attempt === resource.attempt) {
          interrupt(event.message, false);
        }
        break;
    }
  }

  async function clearControl() {
    await resource.controlSaving;
    try {
      await deleteIndexedDbLocalControl(key());
    }
    catch (error) {
      if (!disposed) {
        update({ message: asTransferError(error).message });
      }
    }
  }

  function connected() {
    if (resource.pendingControl) {
      void (resource.controlSaving ?? Promise.resolve()).then(() => {
        if (resource.pendingControl) {
          send({ type: resource.pendingControl, id: item.id });
        }
      });
    }
    else if (resource.pendingOffer) {
      sendOffer();
    }
    else if (!isFileTerminal(item.status)) {
      void resume(undefined, true);
    }
    else if (item.status === "completed") {
      void inspectLocal();
    }
  }

  function stop(type: "file-cancel" | "file-decline") {
    if (isFileTerminal(item.status)) return;

    // A file that has never been offered has no server record to cancel.
    if (item.persistedStatus === undefined && !resource.offerSent) {
      closeResources();
      resource.source = undefined;
      update({ status: type === "file-cancel" ? "cancelled" : "declined", needsSource: false });
      return;
    }

    resource.pendingControl = type;
    closeResources();
    resource.source = undefined;
    update({ status: type === "file-cancel" ? "cancelled" : "declined", needsSource: false, controlPending: true });
    resource.controlSaving = saveIndexedDbLocalControl(key(), type).catch((error) => {
      update({ message: `Cannot save pending cancellation: ${asTransferError(error).message}` });
    });
    void resource.controlSaving.then(() => {
      if (resource.pendingControl === type) {
        send({ type, id });
      }
    });
    if (item.direction === "incoming") {
      void remove();
    }
  }

  async function download() {
    if (item.status !== "completed") return;

    try {
      const file = await getLocalFile(key(), item.fingerprint ?? "", item.size);
      if (!file) {
        await inspectLocal();
        update({ available: false, message: "The local file expired or is no longer available in this browser." });
        return;
      }
      await touchLocalFile(key());
      resource.downloads.push(createFileDownload(file, item.name));
    }
    catch (error) {
      update({ message: asTransferError(error).message });
    }
  }

  async function remove() {
    if (!isFileTerminal(item.status) && item.status !== "interrupted") return;

    try {
      await resource.closing;
      await removeLocalFile(key());
      resource.downloads.forEach(revoke => revoke());
      resource.downloads = [];
      resource.file = undefined;
      update({ available: false, localBytes: 0, hasLocalFile: false, expired: false, bytes: item.status === "completed" ? item.size : 0, message: undefined });
    }
    catch (error) {
      update({ message: `Cannot remove local file: ${asTransferError(error).message}` });
    }
  }

  function disconnect() {
    if (!isFileTerminal(item.status)) {
      if (resource.pendingOffer) {
        // Socket loss must not cancel local hashing or discard the selected File.
        resource.ready = false;
        if (!resource.preparing) {
          waitForConnection();
        }
      }
      else {
        interrupt("Connection interrupted. Your saved progress is kept.");
      }
    }
  }

  function restoreControl(command: TransferResources["pendingControl"]) {
    resource.pendingControl = command;
  }

  function dispose() {
    disposed = true;
    resource.downloads.forEach(revoke => revoke());
    resource.source = undefined;
  }

  return {
    view: item, restore, restoreControl, requestConsent: mobilePermission, offer, resume,
    receiveServerEvent, connected, stop, download, remove, disconnect, dispose,
  };
}

export type Transfer = ReturnType<typeof createTransfer>;
