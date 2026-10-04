import { desc, eq } from "drizzle-orm";
import { getDb } from "#server/db";
import { invite, room } from "#server/db/schema";
import { requireOperator } from "#server/utils/chat";

export default defineEventHandler(async (event) => {
  const operator = await requireOperator(event);
  const records = await getDb().select({ room, expiresAt: invite.expiresAt }).from(room)
    .leftJoin(invite, eq(invite.roomId, room.id))
    .where(eq(room.operatorId, operator.id)).orderBy(desc(room.createdAt));
  return records.map(({ room, expiresAt }) => ({
    id: room.id,
    title: room.title,
    createdAt: room.createdAt.toISOString(),
    visitorJoined: Boolean(room.visitorId),
    operatorName: operator.name,
    inviteExpiresAt: expiresAt?.toISOString() ?? null,
  }));
});
