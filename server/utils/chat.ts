import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { H3Event } from "h3";
import { getDb } from "#server/db";
import { invite, room, user } from "#server/db/schema";
import { auth } from "#server/utils/auth";
import { requireUser } from "#server/utils/require-user";

export async function requireOperator(event: H3Event) {
  const currentUser = await requireUser(event);
  if (currentUser.isAnonymous) {
    throw createError({ statusCode: 403, statusMessage: "Only operators can manage rooms." });
  }
  return currentUser;
}

export function requireChatOrigin(event: H3Event) {
  const origin = getHeader(event, "origin");
  if (origin !== new URL(useRuntimeConfig().betterAuthUrl).origin) {
    throw createError({ statusCode: 403, statusMessage: "Invalid request origin." });
  }
}

export function newInvite(roomId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    token,
    values: { id: randomUUID(), roomId, tokenHash: hashInviteToken(token), expiresAt },
    link: { path: `/?invite=${token}`, expiresAt: expiresAt.toISOString() },
  };
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getInviteToken(event: H3Event) {
  const token = getRouterParam(event, "token") ?? "";
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw createError({ statusCode: 404, statusMessage: "This invite could not be found." });
  }
  return token;
}

export async function getRoomSummary(roomId: string) {
  const db = getDb();
  const [record] = await db.select({
    id: room.id,
    title: room.title,
    createdAt: room.createdAt,
    visitorId: room.visitorId,
    operatorName: user.name,
    inviteExpiresAt: invite.expiresAt,
  }).from(room)
    .innerJoin(user, eq(room.operatorId, user.id))
    .leftJoin(invite, eq(invite.roomId, room.id))
    .where(eq(room.id, roomId));
  if (!record) {
    throw createError({ statusCode: 404, statusMessage: "Room not found." });
  }
  return {
    id: record.id,
    title: record.title,
    createdAt: record.createdAt.toISOString(),
    visitorJoined: Boolean(record.visitorId),
    operatorName: record.operatorName,
    inviteExpiresAt: record.inviteExpiresAt?.toISOString() ?? null,
  };
}

export async function findInvite(event: H3Event) {
  const token = getInviteToken(event);
  const [record] = await getDb().select({ invite, room }).from(invite)
    .innerJoin(room, eq(invite.roomId, room.id))
    .where(eq(invite.tokenHash, hashInviteToken(token)));
  if (!record) {
    throw createError({ statusCode: 404, statusMessage: "This invite could not be found." });
  }
  // A claimed invite only remains usable by its original visitor (including reloads).
  if (record.room.visitorId) {
    const session = await auth.api.getSession({ headers: event.headers });
    if (session?.user.id !== record.room.visitorId) {
      throw createError({ statusCode: 409, statusMessage: "This invite has already been used." });
    }
  }
  else if (record.invite.expiresAt <= new Date()) {
    throw createError({ statusCode: 410, statusMessage: "This invite has expired. Ask your operator for a new link." });
  }
  return record;
}

export async function requireRoomMember(event: H3Event) {
  const currentUser = await requireUser(event);
  const id = getRouterParam(event, "id") ?? "";
  const [record] = await getDb().select().from(room).where(eq(room.id, id));
  if (!record || (record.operatorId !== currentUser.id && record.visitorId !== currentUser.id)) {
    throw createError({ statusCode: 404, statusMessage: "Room not found." });
  }
  return record;
}

export async function requireOwnedRoom(event: H3Event) {
  const operator = await requireOperator(event);
  const id = getRouterParam(event, "id") ?? "";
  const [record] = await getDb().select().from(room)
    .where(and(eq(room.id, id), eq(room.operatorId, operator.id)));
  if (!record) {
    throw createError({ statusCode: 404, statusMessage: "Room not found." });
  }
  return record;
}
