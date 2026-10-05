export interface FileSink {
  write: (chunk: ArrayBuffer) => Promise<void>;
  finish: () => Promise<File>;
  abort: () => Promise<void>;
  remove: () => Promise<void>;
}

/** Disk-backed receiving; storage/export alternatives can implement the same sink. */
export async function openFileSink(id: string, size: number): Promise<FileSink> {
  if (!navigator.storage?.getDirectory) {
    throw new Error("This browser cannot receive large files. Try a supported browser over HTTPS.");
  }
  const { quota, usage } = await navigator.storage.estimate();
  if (quota !== undefined && usage !== undefined && quota - usage < size) {
    throw new Error("Not enough browser storage to receive this file.");
  }
  const root = await navigator.storage.getDirectory();
  const directory = await root.getDirectoryHandle("crisp-transfers", { create: true });
  const handle = await directory.getFileHandle(id, { create: true });
  let writer: FileSystemWritableFileStream;
  try {
    writer = await handle.createWritable();
  }
  catch (error) {
    await directory.removeEntry(id).catch(() => {});
    throw error;
  }
  let closed = false;
  const remove = async () => {
    await directory.removeEntry(id).catch(() => {});
  };
  return {
    async write(chunk) {
      if (closed) throw new Error("File writer is closed.");
      // Estimates are advisory; write errors (including quota exhaustion) still fail the transfer.
      await writer.write(chunk);
    },
    async finish() {
      await writer.close();
      closed = true;
      return handle.getFile();
    },
    async abort() {
      if (!closed) {
        closed = true;
        await writer.abort().catch(() => {});
      }
      await remove();
    },
    remove,
  };
}

/** Export the existing OPFS File; never assemble an in-memory Blob of all chunks. */
export function createFileDownload(file: File, name: string) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Do not revoke immediately: the browser may still be starting the download.
  const timer = setTimeout(() => URL.revokeObjectURL(url), 60000);
  return () => {
    clearTimeout(timer);
    URL.revokeObjectURL(url);
  };
}
