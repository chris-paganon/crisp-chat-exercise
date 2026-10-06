export interface LocalTransferKey {
  userId: string;
  roomId: string;
  id: string;
}

export interface TransferCheckpoint extends LocalTransferKey {
  key: string;
  fingerprint: string;
  bytes: number;
  tailHash: string;
  completed: boolean;
  updatedAt: number;
}

export const LOCAL_FILE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const isCheckpointExpired = (record: TransferCheckpoint, now = Date.now()) => now - record.updatedAt > LOCAL_FILE_RETENTION_MS;

export const localTransferKey = (key: LocalTransferKey) => JSON.stringify([key.userId, key.roomId, key.id]);
// A flat filename cannot escape the OPFS transfer directory.
export const localTransferName = (key: LocalTransferKey) => encodeURIComponent(localTransferKey(key));
let indexedDbPromise: Promise<IDBDatabase> | undefined;

function openIndexedDb() {
  indexedDbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const indexedDbRequest = indexedDB.open("crisp-file-transfers", 2);
    indexedDbRequest.onupgradeneeded = () => {
      for (const indexedDbStoreName of ["checkpoints", "commands"]) {
        if (!indexedDbRequest.result.objectStoreNames.contains(indexedDbStoreName)) {
          indexedDbRequest.result.createObjectStore(indexedDbStoreName, { keyPath: "key" });
        }
      }
    };
    indexedDbRequest.onsuccess = () => {
      const indexedDb = indexedDbRequest.result;
      indexedDb.onversionchange = () => {
        indexedDb.close();
        indexedDbPromise = undefined;
      };
      resolve(indexedDb);
    };
    indexedDbRequest.onerror = () => {
      indexedDbPromise = undefined;
      reject(indexedDbRequest.error ?? new Error("Cannot open transfer checkpoints."));
    };
    indexedDbRequest.onblocked = () => {
      indexedDbPromise = undefined;
      reject(new Error("Close other tabs to update transfer storage."));
    };
  });
  return indexedDbPromise;
}

async function runIndexedDbTransaction<T>(mode: IDBTransactionMode, work: (indexedDbStore: IDBObjectStore) => IDBRequest<T>, indexedDbStoreName = "checkpoints"): Promise<T> {
  const indexedDb = await openIndexedDb();
  return new Promise<T>((resolve, reject) => {
    const indexedDbTransaction = indexedDb.transaction(indexedDbStoreName, mode, { durability: "strict" });
    const indexedDbRequest = work(indexedDbTransaction.objectStore(indexedDbStoreName));
    // Request success alone does not mean the transaction has committed.
    indexedDbTransaction.oncomplete = () => resolve(indexedDbRequest.result);
    indexedDbTransaction.onabort = () => reject(indexedDbTransaction.error ?? indexedDbRequest.error ?? new Error("Cannot save transfer checkpoint."));
    indexedDbTransaction.onerror = () => reject(indexedDbTransaction.error ?? indexedDbRequest.error ?? new Error("Transfer storage failed."));
  });
}

export function readIndexedDbCheckpoint(key: LocalTransferKey): Promise<TransferCheckpoint | undefined> {
  return runIndexedDbTransaction("readonly", indexedDbStore => indexedDbStore.get(localTransferKey(key)));
}

export async function saveIndexedDbCheckpoint(record: TransferCheckpoint) {
  await runIndexedDbTransaction("readwrite", indexedDbStore => indexedDbStore.put(record));
}

export async function deleteIndexedDbCheckpoint(key: LocalTransferKey) {
  await runIndexedDbTransaction("readwrite", indexedDbStore => indexedDbStore.delete(localTransferKey(key)));
}

export type LocalControl = "file-cancel" | "file-decline";

export async function readIndexedDbLocalControl(key: LocalTransferKey): Promise<LocalControl | undefined> {
  const record = await runIndexedDbTransaction<{ key: string; command: LocalControl } | undefined>("readonly", indexedDbStore => indexedDbStore.get(localTransferKey(key)), "commands");
  return record?.command;
}

export async function saveIndexedDbLocalControl(key: LocalTransferKey, command: LocalControl) {
  await runIndexedDbTransaction("readwrite", indexedDbStore => indexedDbStore.put({ key: localTransferKey(key), command }), "commands");
}

export async function deleteIndexedDbLocalControl(key: LocalTransferKey) {
  await runIndexedDbTransaction("readwrite", indexedDbStore => indexedDbStore.delete(localTransferKey(key)), "commands");
}
