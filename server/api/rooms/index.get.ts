import { desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "#server/db";
import { room, user } from "#server/db/schema";
import { requireOperator } from "#server/utils/chat";

export default defineEventHandler(async (event) => {
  const operator = await requireOperator(event);
  const records = await getDb().select({
    id: room.id,
    title: room.title,
    createdAt: room.createdAt,
    operatorName: user.name,
  }).from(room)
    .leftJoin(user, eq(room.operatorId, user.id))
    .where(or(isNull(room.operatorId), eq(room.operatorId, operator.id)))
    .orderBy(desc(room.createdAt));
  return records.map(record => ({ ...record, createdAt: record.createdAt.toISOString() }));
});
