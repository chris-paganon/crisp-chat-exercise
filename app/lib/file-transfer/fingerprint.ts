const HASH_BLOCK_BYTES = 4 * 1024 * 1024;

export async function hashBytes(bytes: ArrayBuffer) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash, byte => byte.toString(16).padStart(2, "0")).join("");
}

/** Hash all content in bounded blocks, then hash the small ordered digest manifest. */
export async function fingerprintFile(file: File, cancelled: () => boolean = () => false) {
  const hashes: string[] = [];
  for (let offset = 0; offset < file.size; offset += HASH_BLOCK_BYTES) {
    if (cancelled()) {
      throw new Error("File verification stopped.");
    }

    hashes.push(await hashBytes(await file.slice(offset, offset + HASH_BLOCK_BYTES).arrayBuffer()));
  }
  if (cancelled()) {
    throw new Error("File verification stopped.");
  }

  return hashBytes(new TextEncoder().encode(`${file.size}:${hashes.join(":")}`).buffer);
}
