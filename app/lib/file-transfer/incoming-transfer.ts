import type { FileReceiverEvent, FileRecord } from "~~/shared/types/file-transfer";
import type { TransferView } from "./model";
import type { TransferOptions } from "./lifecycle";
import type { LocalControl } from "./recovery";
import type { ResumableFileSink } from "./resumable-storage";
import { isFileTerminal } from "~~/shared/types/file-transfer";
import { createTransferLifecycle } from "./lifecycle";
import { createTransferSession } from "./session";
import { asTransferError } from "./rtc-peer";
import { createFileDownload } from "./storage";
import { readIndexedDbCheckpoint, isCheckpointExpired } from "./recovery";
import { getLocalFile, openResumableFileSink, removeLocalFile, touchLocalFile } from "./resumable-storage";

type ReceiveRequest = Extract<FileReceiverEvent, { type: "file-accept" | "file-resume" }>;

interface IncomingResources {
  sink?: ResumableFileSink;
  downloads: (() => void)[];
}

/** Owns acceptance, checkpoint recovery, receiving, and local downloads. */
export function createIncomingTransfer(item: TransferView, options: TransferOptions) {
  const resource: IncomingResources = { downloads: [] };
  const { id } = item;
  const lifecycle = createTransferLifecycle<FileReceiverEvent>(item, options, {
    closeResources(previous) {
      const sink = resource.sink;
      resource.sink = undefined;
      return previous.then(() => sink?.pause());
    },
    finish,
    inspectLocal,
    resume: () => { void resume(true); },
    connected() {
      if (!isFileTerminal(item.status)) {
        lifecycle.resumeIfNeeded();
      }
      else if (item.status === "completed") {
        void inspectLocal();
      }
    },
    createSession(sessionOptions, current, event) {
      if (!resource.sink || resource.sink.offset !== event.offset) {
        throw new Error("The receiving checkpoint does not match.");
      }

      return createTransferSession({
        ...sessionOptions,
        direction: "incoming",
        size: item.size,
        sink: resource.sink,
        complete() {
          if (!current()) return;

          update({ status: "finishing", available: true, localBytes: item.size, hasLocalFile: true, expired: false });
          if (!lifecycle.send({ type: "file-finish", id, attempt: event.attempt })) {
            lifecycle.interrupt("File received. Reconnect to confirm receipt.", false);
          }
        },
      });
    },
  });
  const { state, key, update, isCurrent } = lifecycle;
  const send = lifecycle.send;

  function finish(record: FileRecord) {
    const hadLocalFile = Boolean(resource.sink || item.available || item.localBytes);
    lifecycle.finish(record);
    if (record.status !== "completed" && hadLocalFile) {
      void state.closing.then(() => removeLocalFile(key())).then(() => {
        update({ available: false, localBytes: 0, hasLocalFile: false, expired: false });
      }).catch(error => update({ message: `Cannot remove local file: ${asTransferError(error).message}` }));
    }
  }

  async function inspectLocal() {
    const generation = state.generation;
    try {
      const saved = await readIndexedDbCheckpoint(key());
      const file = await getLocalFile(key(), item.fingerprint ?? "", item.size);
      if (!isCurrent(generation)) return;

      update({
        localBytes: saved?.bytes ?? 0, available: Boolean(file), hasLocalFile: Boolean(saved),
        expired: saved ? isCheckpointExpired(saved) : false,
        bytes: state.session || item.status === "completed" ? item.bytes : saved?.bytes ?? item.bytes,
      });
      if (file && !isFileTerminal(item.status) && item.persistedStatus !== "offered" && options.connected()) {
        send({ type: "file-finish", id: item.id });
      }
    }
    catch (error) {
      update({ message: asTransferError(error).message });
    }
  }

  async function accept() {
    if (item.persistedStatus !== "offered") return;

    await lifecycle.request("file-accept", generation => prepare(generation, "file-accept", false));
  }

  async function resume(automatic = false) {
    // An interrupted acceptance still needs consent before the first transfer.
    if (item.persistedStatus === "offered") {
      if (!automatic) {
        await accept();
      }
      return;
    }

    await lifecycle.request("file-resume", generation => prepare(generation, "file-resume", automatic));
  }

  function stop(type: LocalControl) {
    if (lifecycle.stop(type)) {
      void remove();
    }
  }

  async function prepare(generation: number, type: ReceiveRequest["type"], automatic: boolean): Promise<ReceiveRequest | undefined> {
    const saved = await readIndexedDbCheckpoint(key());
    if (automatic && !saved) return;
    if (automatic && saved && isCheckpointExpired(saved)) {
      update({ status: "interrupted", expired: true, message: "The saved partial expired after seven days. Restart receiving to continue." });
      return;
    }
    if (!lifecycle.requestConsent()) return;

    await state.closing;
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
      await state.closing;
      await removeLocalFile(key());
      resource.downloads.forEach(revoke => revoke());
      resource.downloads = [];
      update({ available: false, localBytes: 0, hasLocalFile: false, expired: false, bytes: item.status === "completed" ? item.size : 0, message: undefined });
    }
    catch (error) {
      update({ message: `Cannot remove local file: ${asTransferError(error).message}` });
    }
  }

  function dispose() {
    lifecycle.dispose();
    resource.downloads.forEach(revoke => revoke());
  }

  return {
    direction: "incoming" as const,
    view: item, restore: lifecycle.restore, restoreControl: lifecycle.restoreControl,
    accept, resume, stop, download, remove,
    receiveServerEvent: lifecycle.receiveServerEvent, connected: lifecycle.connected,
    disconnect: lifecycle.disconnect, dispose,
  };
}
