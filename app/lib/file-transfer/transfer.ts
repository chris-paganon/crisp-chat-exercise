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

type TransferRequest = Extract<FileClientEvent, { type: "file-accept" | "file-resume" }>;

interface TransferResources {
  source?: File;
  sink?: ResumableFileSink;
  session?: TransferSession;
  attempt?: string;
  // A sent offer, accept, or resume request allows file-start and prevents duplicate requests.
  requestSent: boolean;
  preparing: boolean;
  pendingOffer?: boolean;
  // Remembers whether the server may know this offer, even after interruption.
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
    downloads: [], requestSent: false, preparing: false, generation: 0, closing: Promise.resolve(),
  };
  const { id } = item;
  const key = () => ({ userId: options.userId(), roomId: options.roomId, id });
  const publish = options.changed;
  let disposed = false;

  function isCurrent(generation: number) {
    return !disposed && resource.generation === generation;
  }

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
    resource.requestSent = false;
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
    const hadLocalFile = Boolean(resource.sink || item.available || item.localBytes);
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
      if (!isCurrent(generation)) return;

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
      if (resource.session || (resource.requestSent && record.message)) {
        closeResources();
      }
      update({ status: "offered", message: record.message ?? undefined, needsSource: item.direction === "outgoing" && !resource.source });
    }
    else if (!resource.session && !resource.preparing && !resource.requestSent) {
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
    const fingerprint = await verifyFileFingerprint(file, () => !isCurrent(generation));
    if (!isCurrent(generation)) return false;
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
    resource.requestSent = false;
    update({ status: "waiting-connection", message: undefined });
  }

  function sendOffer() {
    if (disposed || resource.preparing || resource.requestSent || !resource.pendingOffer || !item.fingerprint) return;

    if (!options.historyReady() || !options.connected()) {
      waitForConnection();
      return;
    }

    update({ status: "offering", message: undefined });
    resource.requestSent = send({ type: "file-offer", id: item.id, name: item.name, size: item.size, mime: item.mime, fingerprint: item.fingerprint });
    if (resource.requestSent) {
      resource.offerSent = true;
    }
    else {
      waitForConnection();
    }
  }

  async function accept() {
    if (item.direction !== "incoming" || item.persistedStatus !== "offered") return;

    await requestTransfer("file-accept");
  }

  async function resume(file?: File, automatic = false) {
    // An interrupted acceptance still needs consent before the first transfer.
    if (item.direction === "incoming" && item.persistedStatus === "offered") {
      if (!automatic) {
        await accept();
      }
      return;
    }

    await requestTransfer("file-resume", file, automatic);
  }

  // Acceptance and resumption share resource preparation and request bookkeeping.
  async function requestTransfer(type: TransferRequest["type"], file?: File, automatic = false) {
    if (disposed || isFileTerminal(item.status)) return;

    if (resource.preparing || resource.requestSent || resource.session || resource.pendingControl) return;
    if (item.direction === "outgoing" && !file && !resource.source) {
      update({ status: "interrupted", needsSource: true, message: "Reselect the original file to resume." });
      return;
    }
    if (!options.historyReady() || !options.connected()) {
      update({ message: type === "file-accept" ? "Reconnect to accept this file." : "Reconnect to resume this transfer." });
      return;
    }
    resource.preparing = true;
    resource.pendingOffer = item.direction === "outgoing" && item.persistedStatus === undefined;
    const generation = resource.generation;
    update({ status: "preparing", message: undefined });
    try {
      const request = item.direction === "outgoing"
        ? await prepareOutgoing(generation, file)
        : await prepareIncoming(generation, type, automatic);
      if (!request || !isCurrent(generation)) return;

      resource.requestSent = send(request);
      if (!isCurrent(generation)) return;

      if (!resource.requestSent) {
        interrupt(type === "file-accept" ? "Reconnect to accept this file." : "Reconnect to resume this transfer.", false);
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
        if (!resource.requestSent && item.status === "preparing") {
          update({ status: item.persistedStatus === "offered" ? "offered" : "interrupted" });
        }
      }
    }
  }

  async function prepareOutgoing(generation: number, file?: File): Promise<TransferRequest | undefined> {
    if (!mobilePermission()) return;

    await resource.closing;
    if (!isCurrent(generation)) return;

    if ((file || !item.fingerprint) && !await verifySource(file ?? resource.source!)) return;
    if (resource.pendingOffer) {
      resource.preparing = false;
      sendOffer();
      return;
    }

    return { type: "file-resume", id, offset: 0 };
  }

  async function prepareIncoming(generation: number, type: TransferRequest["type"], automatic: boolean): Promise<TransferRequest | undefined> {
    const saved = await readIndexedDbCheckpoint(key());
    if (automatic && !saved) return;
    if (automatic && saved && isCheckpointExpired(saved)) {
      update({ status: "interrupted", expired: true, message: "The saved partial expired after seven days. Restart receiving to continue." });
      return;
    }
    if (!mobilePermission()) return;

    await resource.closing;
    if (!isCurrent(generation)) return;

    if (!item.fingerprint) {
      throw new Error("This older file offer cannot be resumed. Ask the sender to offer it again.");
    }

    if (saved && isCheckpointExpired(saved)) {
      // Expiration reclaims data only on an explicit restart, never during history loading.
      await removeLocalFile(key());
      if (!isCurrent(generation)) return;

      update({ bytes: 0, localBytes: 0, hasLocalFile: false, expired: false });
    }
    const completed = await getLocalFile(key(), item.fingerprint, item.size);
    if (completed && type === "file-resume") {
      update({ status: "finishing", available: true, hasLocalFile: true });
      send({ type: "file-finish", id });
      return;
    }
    const sink = await openResumableFileSink(key(), item.size, item.fingerprint);
    if (!isCurrent(generation)) {
      await sink.pause();
      return;
    }
    resource.sink = sink;
    item.bytes = sink.offset;
    item.localBytes = sink.offset;
    item.hasLocalFile = true;
    return { type, id, offset: sink.offset };
  }

  function start(event: Extract<FileServerEvent, { type: "file-start" }>) {
    if (resource.session || isFileTerminal(item.status) || !resource.requestSent) return;
    if (event.offset > item.size) return fail(new Error("Invalid resume position."));

    resource.attempt = event.attempt;
    update({ status: "connecting", bytes: event.offset, message: undefined });
    const generation = resource.generation;
    const current = () => isCurrent(generation) && resource.attempt === event.attempt;
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

        resource.session = createReceiveSession({ ...shared, size: item.size, sink: resource.sink, complete() {
          if (!current()) return;

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
        resumeIfNeeded();
        break;
      case "file-waiting":
        if (resource.requestSent) {
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

  function resumeIfNeeded() {
    if (disposed || isFileTerminal(item.status)) return;
    if (resource.preparing || resource.requestSent || resource.session || resource.pendingControl) return;
    if (item.direction === "incoming" && item.persistedStatus === "offered") return;

    void resume(undefined, true);
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
      resumeIfNeeded();
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
        resource.requestSent = false;
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
    view: item, restore, restoreControl, requestConsent: mobilePermission, offer, accept, resume,
    receiveServerEvent, connected, stop, download, remove, disconnect, dispose,
  };
}

export type Transfer = ReturnType<typeof createTransfer>;
