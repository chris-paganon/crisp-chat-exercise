import { eq } from "drizzle-orm";
import { getDb } from "#server/db";
import { invite, room } from "#server/db/schema";
import { findInvite, getRoomSummary, requireChatOrigin } from "#server/utils/chat";
import { requireUser } from "#server/utils/require-user";

export default defineEventHandler(async (event) => {
  requireChatOrigin(event);
  const visitor = await requireUser(event);
  if (!visitor.isAnonymous) {
    throw createError({ statusCode: 403, statusMessage: "Open this link in a private window to join as a visitor." });
  }
  const record = await findInvite(event);
  await getDb().transaction(async (tx) => {
    const [lockedRoom] = await tx.select().from(room).where(eq(room.id, record.room.id)).for("update");
    const [lockedInvite] = await tx.select().from(invite).where(eq(invite.id, record.invite.id)).for("update");
    if (!lockedRoom || !lockedInvite) {
      throw createError({ statusCode: 410, statusMessage: "This invite was replaced. Ask for the latest link." });
    }
    if (lockedRoom.visitorId === visitor.id) return;
    if (lockedRoom.visitorId || lockedInvite.acceptedAt) {
      throw createError({ statusCode: 409, statusMessage: "This invite has already been used." });
    }
    if (lockedInvite.expiresAt <= new Date()) {
      throw createError({ statusCode: 410, statusMessage: "This invite has expired. Ask for a new link." });
    }
    await tx.update(room).set({ visitorId: visitor.id }).where(eq(room.id, lockedRoom.id));
    await tx.update(invite).set({ acceptedAt: new Date() }).where(eq(invite.id, lockedInvite.id));
  });
  return getRoomSummary(record.room.id);
});
