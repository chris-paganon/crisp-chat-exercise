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

export const localTransferKey = (key: LocalTransferKey) => JSON.stringify([key.userId, key.roomId, key.id]);
// A flat filename cannot escape the OPFS transfer directory.
export const localTransferName = (key: LocalTransferKey) => encodeURIComponent(localTransferKey(key));
let database: Promise<IDBDatabase> | undefined;

function openDatabase() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("crisp-file-transfers", 2);
    request.onupgradeneeded = () => {
      for (const name of ["checkpoints", "commands"]) {
        if (!request.result.objectStoreNames.contains(name)) {
          request.result.createObjectStore(name, { keyPath: "key" });
        }
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        database = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      database = undefined;
      reject(request.error ?? new Error("Cannot open transfer checkpoints."));
    };
    request.onblocked = () => {
      database = undefined;
      reject(new Error("Close other tabs to update transfer storage."));
    };
  });
  return database;
}

async function transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>, storeName = "checkpoints"): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode, { durability: "strict" });
    const request = work(tx.objectStore(storeName));
    // Request success alone does not mean the transaction has committed.
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error ?? request.error ?? new Error("Cannot save transfer checkpoint."));
    tx.onerror = () => reject(tx.error ?? request.error ?? new Error("Transfer storage failed."));
  });
}

export function readCheckpoint(key: LocalTransferKey): Promise<TransferCheckpoint | undefined> {
  return transaction("readonly", store => store.get(localTransferKey(key)));
}

export async function saveCheckpoint(record: TransferCheckpoint) {
  await transaction("readwrite", store => store.put(record));
}

export async function deleteCheckpoint(key: LocalTransferKey) {
  await transaction("readwrite", store => store.delete(localTransferKey(key)));
}

export type LocalControl = "file-cancel" | "file-decline";

export async function readLocalControl(key: LocalTransferKey): Promise<LocalControl | undefined> {
  const record = await transaction<{ key: string; command: LocalControl } | undefined>("readonly", store => store.get(localTransferKey(key)), "commands");
  return record?.command;
}

export async function saveLocalControl(key: LocalTransferKey, command: LocalControl) {
  await transaction("readwrite", store => store.put({ key: localTransferKey(key), command }), "commands");
}

export async function deleteLocalControl(key: LocalTransferKey) {
  await transaction("readwrite", store => store.delete(localTransferKey(key)), "commands");
}
