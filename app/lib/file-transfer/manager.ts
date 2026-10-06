import type { FileClientEvent, FileServerEvent, FileRecord } from "~~/shared/types/file-transfer";
import type { TransferView } from "./model";
import type { LocalControl } from "./recovery";
import { isFileTerminal } from "~~/shared/types/file-transfer";
import { nowTimestamp } from "~~/shared/utils/date";
import { createOutgoingTransfer } from "./outgoing-transfer";
import { createIncomingTransfer } from "./incoming-transfer";
import { readIndexedDbLocalControl, deleteIndexedDbLocalControl } from "./recovery";

type Transfer = ReturnType<typeof createOutgoingTransfer> | ReturnType<typeof createIncomingTransfer>;

interface ManagerOptions {
  roomId: string;
  userId: () => string;
  connected: () => boolean;
  send: (event: FileClientEvent) => void;
  changed: (transfers: TransferView[]) => void;
}

export function createTransferManager(options: ManagerOptions) {
  const transfers = new Map<string, Transfer>();
  let disposed = false;
  let historyReady = false;
  let hydrationGeneration = 0;
  const key = (id: string) => ({ userId: options.userId(), roomId: options.roomId, id });
  const publish = () => options.changed([...transfers.values()].map(transfer => ({ ...transfer.view })));
  const transferOptions = () => ({ ...options, historyReady: () => historyReady, changed: publish });

  function createTransfer(view: TransferView) {
    return view.direction === "outgoing"
      ? createOutgoingTransfer(view, transferOptions())
      : createIncomingTransfer(view, transferOptions());
  }

  function restoreRecord(record: FileRecord, control?: { command: LocalControl | undefined }) {
    if (disposed || record.roomId !== options.roomId) return;

    let transfer = transfers.get(record.id);
    const fresh = !transfer;
    if (!transfer) {
      transfer = createTransfer({
        ...record, direction: record.senderId === options.userId() ? "outgoing" : "incoming",
        bytes: record.status === "completed" ? record.size : 0,
        status: record.status === "accepted" ? "interrupted" : record.status, message: record.message ?? undefined,
      });
      transfers.set(record.id, transfer);
    }
    if (control) {
      transfer.restoreControl(control.command);
    }
    transfer.restore(record, fresh);
  }

  function restore(record: FileRecord) {
    restoreRecord(record);
  }

  async function hydrate(records: FileRecord[]) {
    const generation = ++hydrationGeneration;
    historyReady = false;
    for (const record of records) {
      if (disposed || generation !== hydrationGeneration) return;

      let control: { command: LocalControl | undefined } | undefined;
      try {
        const command = await readIndexedDbLocalControl(key(record.id));
        if (disposed || generation !== hydrationGeneration) return;

        control = { command: isFileTerminal(record.status) ? undefined : command };
        if (command && isFileTerminal(record.status)) {
          await deleteIndexedDbLocalControl(key(record.id));
        }
      }
      catch {
        // DB history remains readable if local browser storage is unavailable.
      }
      if (disposed || generation !== hydrationGeneration) return;

      restoreRecord(record, control);
    }
    if (disposed || generation !== hydrationGeneration || !options.connected()) return;

    historyReady = true;
    connected();
  }

  function connected() {
    for (const transfer of transfers.values()) {
      transfer.connected();
    }
  }

  async function offer(file: File) {
    if (disposed) return;

    const transfer = createOutgoingTransfer({
      id: crypto.randomUUID(), name: file.name, size: file.size, mime: file.type,
      direction: "outgoing", status: "verifying", bytes: 0, createdAt: nowTimestamp(),
    }, transferOptions());
    if (!transfer.requestConsent()) return;

    transfers.set(transfer.view.id, transfer);
    publish();
    await transfer.offer(file);
  }

  async function accept(id: string) {
    const transfer = transfers.get(id);
    if (transfer?.direction === "incoming") {
      await transfer.accept();
    }
  }

  async function resume(id: string, file?: File, automatic = false) {
    const transfer = transfers.get(id);
    if (transfer?.direction === "outgoing") {
      await transfer.resume(file);
    }
    else if (transfer?.direction === "incoming") {
      await transfer.resume(automatic);
    }
  }

  function receiveServerEvent(event: FileServerEvent) {
    if (disposed) return;
    if (event.type === "file-record") {
      restore(event.record);
      return;
    }

    transfers.get(event.id)?.receiveServerEvent(event);
  }

  function stop(id: string, type: LocalControl) {
    const transfer = transfers.get(id);
    if (transfer?.direction === "incoming") {
      transfer.stop(type);
    }
    else if (transfer?.direction === "outgoing" && type === "file-cancel") {
      transfer.stop();
    }
  }

  async function download(id: string) {
    const transfer = transfers.get(id);
    if (transfer?.direction === "incoming") {
      await transfer.download();
    }
  }

  async function remove(id: string) {
    const transfer = transfers.get(id);
    if (transfer?.direction === "incoming") {
      await transfer.remove();
    }
  }

  function disconnect() {
    historyReady = false;
    hydrationGeneration++;
    for (const transfer of transfers.values()) {
      transfer.disconnect();
    }
  }

  function dispose() {
    disconnect();
    disposed = true;
    for (const transfer of transfers.values()) {
      transfer.dispose();
    }
  }

  return { hydrate, restore, connected, offer, accept, resume, receiveServerEvent, stop, download, remove, disconnect, dispose };
}
