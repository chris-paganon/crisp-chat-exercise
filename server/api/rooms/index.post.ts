import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "#server/db";
import { room } from "#server/db/schema";
import { getRoomSummary } from "#server/utils/chat";
import { requireUser } from "#server/utils/require-user";

export default defineEventHandler(async (event) => {
  const visitor = await requireUser(event);
  if (!visitor.isAnonymous) {
    throw createError({ statusCode: 403, statusMessage: "Only visitors can start a conversation." });
  }

  const db = getDb();
  // The unique visitor slot also makes retries and concurrent opens idempotent.
  await db.insert(room).values({ id: randomUUID(), title: "Support conversation", visitorId: visitor.id })
    .onConflictDoNothing({ target: room.visitorId });
  const [record] = await db.select({ id: room.id }).from(room).where(eq(room.visitorId, visitor.id));
  if (!record) {
    throw createError({ statusCode: 500, statusMessage: "Failed to create room." });
  }

  return getRoomSummary(record.id);
});
