export interface FileSink {
  write: (chunk: ArrayBuffer) => Promise<void>;
  finish: () => Promise<File>;
  checkpoint?: () => Promise<number>;
  abort: () => Promise<void>;
  remove: () => Promise<void>;
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
