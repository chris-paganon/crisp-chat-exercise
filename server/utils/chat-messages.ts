import { and, asc, eq } from "drizzle-orm";
import { getDb } from "#server/db";
import { message } from "#server/db/schema";

const messageFields = {
  id: message.id,
  roomId: message.roomId,
  senderId: message.senderId,
  body: message.body,
  createdAt: message.createdAt,
};

export async function loadChatHistory(roomId: string) {
  const db = getDb();
  const history = await db.select(messageFields)
    .from(message)
    .where(eq(message.roomId, roomId))
    .orderBy(asc(message.createdAt), asc(message.id));

  return history;
}

export async function saveChatMessage(roomId: string, userId: string, id: string, body: string) {
  const db = getDb();
  const [inserted] = await db.insert(message)
    .values({
      id,
      roomId,
      senderId: userId,
      body,
    })
    .onConflictDoNothing({ target: message.id })
    .returning(messageFields);

  // A retry returns the original persisted message, even if the acknowledgement was lost.
  const record = inserted ?? (await db.select(messageFields)
    .from(message)
    .where(and(
      eq(message.roomId, roomId),
      eq(message.senderId, userId),
      eq(message.id, id),
    )))[0];

  if (!record) {
    throw new Error("Message was not saved.");
  }

  return record;
}
