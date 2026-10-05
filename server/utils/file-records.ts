import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "#server/db";
import { fileTransfer } from "#server/db/schema";
import type { FileLifecycle, FileOffer } from "~~/shared/types/file-transfer";

export function loadFileHistory(roomId: string) {
  return getDb().select().from(fileTransfer).where(eq(fileTransfer.roomId, roomId))
    .orderBy(asc(fileTransfer.createdAt), asc(fileTransfer.id));
}

export async function findFileRecord(roomId: string, id: string) {
  return (await getDb().select().from(fileTransfer)
    .where(and(eq(fileTransfer.roomId, roomId), eq(fileTransfer.id, id))))[0];
}

export async function saveFileOffer(roomId: string, senderId: string, receiverId: string, offer: FileOffer) {
  const [inserted] = await getDb().insert(fileTransfer).values({
    ...offer, roomId, senderId, receiverId, fingerprint: offer.fingerprint ?? "",
  }).onConflictDoNothing({ target: fileTransfer.id }).returning();
  const record = inserted ?? await findFileRecord(roomId, offer.id);

  if (!record || record.senderId !== senderId || record.receiverId !== receiverId
    || record.name !== offer.name || record.size !== offer.size || record.mime !== offer.mime
    || record.fingerprint !== (offer.fingerprint ?? "")) {
    throw new Error("This transfer ID belongs to another file offer.");
  }

  return record;
}

export async function updateFileRecord(roomId: string, id: string, status: FileLifecycle, message?: string) {
  const [record] = await getDb().update(fileTransfer).set({
    status, message: message ?? null, updatedAt: new Date(), version: sql`${fileTransfer.version} + 1`,
  }).where(and(eq(fileTransfer.roomId, roomId), eq(fileTransfer.id, id))).returning();

  if (!record) {
    throw new Error("File offer not found.");
  }

  return record;
}
