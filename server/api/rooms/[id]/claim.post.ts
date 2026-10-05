import { eq } from "drizzle-orm";
import { getDb } from "#server/db";
import { room } from "#server/db/schema";
import { getRoomSummary, requireOperator } from "#server/utils/chat";

export default defineEventHandler(async (event) => {
  const operator = await requireOperator(event);
  const id = getRouterParam(event, "id") ?? "";
  await getDb().transaction(async (tx) => {
    const [record] = await tx.select().from(room).where(eq(room.id, id)).for("update");
    if (!record) {
      throw createError({ statusCode: 404, statusMessage: "Room not found." });
    }
    if (record.operatorId && record.operatorId !== operator.id) {
      throw createError({ statusCode: 409, statusMessage: "Another operator has already claimed this conversation." });
    }
    if (!record.operatorId) {
      await tx.update(room).set({ operatorId: operator.id }).where(eq(room.id, id));
    }
  });
  return getRoomSummary(id);
});
