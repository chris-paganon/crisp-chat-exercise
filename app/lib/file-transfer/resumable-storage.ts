import type { FileSink } from "./storage";
import type { LocalTransferKey } from "./recovery";
import type { StorageCommand } from "./storage-worker";
import { deleteCheckpoint, localTransferName, readCheckpoint, isCheckpointExpired, saveCheckpoint } from "./recovery";

export interface ResumableFileSink extends FileSink {
  offset: number;
  checkpoint: () => Promise<number>;
  pause: () => Promise<void>;
}

// Reserve outstanding writes across all retained room sessions in this app.
const reservations = new Map<string, number>();
let preparing = Promise.resolve();

export async function getLocalFile(key: LocalTransferKey, fingerprint: string, size: number) {
  const saved = await readCheckpoint(key);
  if (!saved?.completed || isCheckpointExpired(saved) || saved.fingerprint !== fingerprint || saved.bytes !== size) return;

  try {
    const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle("crisp-transfers");
    const file = await (await directory.getFileHandle(localTransferName(key))).getFile();
    return file.size === size ? file : undefined;
  }
  catch {
    return undefined;
  }
}

export async function touchLocalFile(key: LocalTransferKey) {
  const saved = await readCheckpoint(key);
  if (saved) {
    await saveCheckpoint({ ...saved, updatedAt: Date.now() });
  }
}

export async function removeLocalFile(key: LocalTransferKey) {
  const root = await navigator.storage.getDirectory();
  try {
    const directory = await root.getDirectoryHandle("crisp-transfers");
    await directory.removeEntry(localTransferName(key));
  }
  catch (error) {
    if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error;
  }
  await deleteCheckpoint(key);
}

export async function openResumableFileSink(key: LocalTransferKey, size: number, fingerprint: string): Promise<ResumableFileSink> {
  if (!navigator.storage?.getDirectory || !globalThis.Worker) {
    throw new Error("This browser cannot receive resumable large files. Try a supported browser over HTTPS.");
  }
  const name = localTransferName(key);
  const reserve = preparing.then(async () => {
    if (reservations.has(name)) throw new Error("This file is already being received.");

    const saved = await readCheckpoint(key);
    const remaining = Math.max(0, size - (saved?.bytes ?? 0));
    const { quota, usage } = await navigator.storage.estimate();
    const reserved = [...reservations.values()].reduce((sum, bytes) => sum + bytes, 0);
    if (quota !== undefined && usage !== undefined && quota - usage < remaining + reserved) {
      throw new Error("Not enough browser storage for the active file transfers.");
    }
    reservations.set(name, remaining);
  });
  preparing = reserve.catch(() => {});
  await reserve;

  let worker: Worker;
  try {
    worker = new Worker(new URL("./storage-worker.ts", import.meta.url), { type: "module" });
  }
  catch (error) {
    reservations.delete(name);
    throw error;
  }
  let sequence = 0;
  let closed = false;
  let finishing: Promise<File> | undefined;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  function shutdown(error = new Error("File writer is closed.")) {
    closed = true;
    reservations.delete(name);
    pending.forEach(request => request.reject(error));
    pending.clear();
    worker.terminate();
  }
  worker.onmessage = ({ data }) => {
    const request = pending.get(data.requestId);
    if (!request) return;

    pending.delete(data.requestId);
    if (data.error) {
      request.reject(new Error(data.error));
    }
    else {
      request.resolve(data.value);
    }
  };
  worker.onerror = () => shutdown(new Error("File storage worker failed."));

  function call<T>(command: StorageCommand, transfer: Transferable[] = []): Promise<T> {
    if (closed) return Promise.reject(new Error("File writer is closed."));

    return new Promise<T>((resolve, reject) => {
      const requestId = ++sequence;
      pending.set(requestId, { resolve: value => resolve(value as T), reject });
      try {
        worker.postMessage({ ...command, requestId }, transfer);
      }
      catch (error) {
        pending.delete(requestId);
        reject(error instanceof Error ? error : new Error("File storage request failed."));
      }
    });
  }

  try {
    const offset = await call<number>({ type: "open", key, size, fingerprint });
    const pause = async () => {
      if (finishing) {
        await finishing.catch(() => {});
        return;
      }
      if (closed) return;

      try {
        await call({ type: "pause" });
      }
      finally {
        shutdown();
      }
    };
    return {
      offset,
      async write(chunk) {
        const bytes = await call<number>({ type: "write", chunk }, [chunk]);
        reservations.set(name, size - bytes);
      },
      checkpoint: () => call<number>({ type: "checkpoint" }),
      finish() {
        finishing ??= call<File>({ type: "finish" }).finally(() => shutdown());
        return finishing;
      },
      pause,
      async abort() {
        await pause();
        await removeLocalFile(key);
      },
      async remove() {
        await pause();
        await removeLocalFile(key);
      },
    };
  }
  catch (error) {
    shutdown();
    throw error;
  }
}
