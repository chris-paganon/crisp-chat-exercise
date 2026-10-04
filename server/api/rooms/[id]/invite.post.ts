import { eq } from "drizzle-orm";
import { getDb } from "#server/db";
import { invite, room } from "#server/db/schema";
import { newInvite, requireChatOrigin, requireOwnedRoom } from "#server/utils/chat";

export default defineEventHandler(async (event) => {
  requireChatOrigin(event);
  const ownedRoom = await requireOwnedRoom(event);
  const invitation = newInvite(ownedRoom.id);
  await getDb().transaction(async (tx) => {
    // All invite mutations lock the room first, so rotation cannot race a join.
    const [lockedRoom] = await tx.select().from(room).where(eq(room.id, ownedRoom.id)).for("update");
    if (!lockedRoom || lockedRoom.visitorId) {
      throw createError({ statusCode: 409, statusMessage: "A visitor has already joined this room." });
    }
    await tx.delete(invite).where(eq(invite.roomId, ownedRoom.id));
    await tx.insert(invite).values(invitation.values);
  });
  return invitation.link;
});
