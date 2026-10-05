import { eq } from "drizzle-orm";
import type { H3Event } from "h3";
import { getDb } from "#server/db";
import { room, user } from "#server/db/schema";
import { requireUser } from "#server/utils/require-user";

export async function requireOperator(event: H3Event) {
  const currentUser = await requireUser(event);
  if (currentUser.isAnonymous) {
    throw createError({ statusCode: 403, statusMessage: "Only operators can manage rooms." });
  }
  return currentUser;
}

export async function getRoomSummary(roomId: string) {
  const db = getDb();
  const [record] = await db.select({
    id: room.id,
    title: room.title,
    createdAt: room.createdAt,
    operatorName: user.name,
  }).from(room)
    .leftJoin(user, eq(room.operatorId, user.id))
    .where(eq(room.id, roomId));
  if (!record) {
    throw createError({ statusCode: 404, statusMessage: "Room not found." });
  }
  return record;
}

export async function requireRoomMember(event: H3Event) {
  const currentUser = await requireUser(event);
  const id = getRouterParam(event, "id") ?? "";
  return requireRoomMemberById(id, currentUser.id);
}

export async function requireRoomMemberById(id: string, userId: string) {
  const [record] = await getDb().select().from(room).where(eq(room.id, id));
  if (!record || (record.operatorId !== userId && record.visitorId !== userId)) {
    throw createError({ statusCode: 404, statusMessage: "Room not found." });
  }
  return record;
}
