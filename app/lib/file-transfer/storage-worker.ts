import { fingerprintFile, hashBytes } from "./fingerprint";
import { BATCH_BYTES } from "./protocol";
import { localTransferKey, localTransferName, readCheckpoint, saveCheckpoint } from "./recovery";
import type { LocalTransferKey, TransferCheckpoint } from "./recovery";

interface SyncFileHandle {
  write: (data: ArrayBuffer, options: { at: number }) => number;
  read: (data: ArrayBuffer, options: { at: number }) => number;
  getSize: () => number;
  truncate: (size: number) => void;
  flush: () => void;
  close: () => void;
}
interface SyncFile extends FileSystemFileHandle {
  createSyncAccessHandle: () => Promise<SyncFileHandle>;
}
export type StorageCommand
  = | { type: "open"; key: LocalTransferKey; size: number; fingerprint: string }
    | { type: "write"; chunk: ArrayBuffer }
    | { type: "checkpoint" | "finish" | "pause" };

const scope = self as unknown as {
  onmessage: (event: MessageEvent<StorageCommand & { requestId: number }>) => void;
  postMessage: (result: unknown) => void;
};
let handle: SyncFileHandle | undefined;
let fileHandle: FileSystemFileHandle | undefined;
let record: TransferCheckpoint | undefined;
let written = 0;
let expectedSize = 0;
let queue = Promise.resolve();

async function tailHash() {
  if (!handle) {
    throw new Error("File writer is closed.");
  }

  const start = Math.max(0, written - BATCH_BYTES);
  const bytes = new ArrayBuffer(written - start);
  if (handle.read(bytes, { at: start }) !== bytes.byteLength) {
    throw new Error("The saved partial file cannot be read.");
  }
  return hashBytes(bytes);
}

async function checkpoint(completed = false) {
  if (!handle || !record) {
    throw new Error("File writer is closed.");
  }

  handle.flush();
  const next = { ...record, bytes: written, tailHash: await tailHash(), completed, updatedAt: Date.now() };
  await saveCheckpoint(next);
  record = next;
  return written;
}

async function execute(command: StorageCommand) {
  switch (command.type) {
    case "open": {
      if (handle) {
        throw new Error("File writer is already open.");
      }

      const root = await navigator.storage.getDirectory();
      const directory = await root.getDirectoryHandle("crisp-transfers", { create: true });
      fileHandle = await directory.getFileHandle(localTransferName(command.key), { create: true });
      const syncFile = fileHandle as SyncFile;
      if (!syncFile.createSyncAccessHandle) {
        throw new Error("This browser cannot resume large files. Use a browser with OPFS worker access over HTTPS.");
      }
      handle = await syncFile.createSyncAccessHandle();
      const saved = await readCheckpoint(command.key);
      expectedSize = command.size;
      written = saved?.bytes ?? 0;
      if (saved && (saved.fingerprint !== command.fingerprint || written > expectedSize
        || written > handle.getSize() || saved.tailHash !== await tailHash())) {
        throw new Error("The partial file is missing or damaged. Remove the local file, then restart receiving.");
      }
      // A crash may leave bytes written beyond the last committed IndexedDB checkpoint.
      handle.truncate(written);
      record = saved ?? {
        ...command.key, key: localTransferKey(command.key), fingerprint: command.fingerprint,
        bytes: 0, tailHash: await tailHash(), completed: false, updatedAt: Date.now(),
      };
      await checkpoint(saved?.completed ?? false);
      return written;
    }
    case "write": {
      if (!handle || written + command.chunk.byteLength > expectedSize) {
        throw new Error("Invalid file write.");
      }
      const count = handle.write(command.chunk, { at: written });
      if (count !== command.chunk.byteLength) {
        throw new Error("The entire file chunk could not be written.");
      }

      written += count;
      return written;
    }
    case "checkpoint":
      return checkpoint();
    case "finish": {
      if (!handle || !fileHandle || !record || written !== expectedSize) {
        throw new Error("The file is incomplete.");
      }
      await checkpoint();
      handle.close();
      handle = undefined;
      const file = await fileHandle.getFile();
      if (await fingerprintFile(file) !== record.fingerprint) {
        throw new Error("Received file verification failed. Remove the local file and send it again.");
      }
      await saveCheckpoint({ ...record, completed: true, updatedAt: Date.now() });
      return file;
    }
    case "pause":
      // Only acknowledged checkpoints survive; discard any unacknowledged tail on reopening.
      handle?.close();
      handle = undefined;
      return undefined;
  }
}

scope.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      const value = await execute(data);
      scope.postMessage({ requestId: data.requestId, value });
    }
    catch (error) {
      handle?.close();
      handle = undefined;
      scope.postMessage({ requestId: data.requestId, error: error instanceof Error ? error.message : "File storage failed." });
    }
  });
};
