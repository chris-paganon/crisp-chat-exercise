import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "#server/db";
import { invite, room } from "#server/db/schema";
import { getRoomSummary, newInvite, requireChatOrigin, requireOperator } from "#server/utils/chat";

const bodySchema = z.object({ title: z.string().trim().min(1).max(100) });

export default defineEventHandler(async (event) => {
  requireChatOrigin(event);
  const operator = await requireOperator(event);
  const result = bodySchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Enter a room name of 1–100 characters." });
  }
  const id = randomUUID();
  const invitation = newInvite(id);
  await getDb().transaction(async (tx) => {
    await tx.insert(room).values({ id, title: result.data.title, operatorId: operator.id });
    await tx.insert(invite).values(invitation.values);
  });
  return { room: await getRoomSummary(id), invite: invitation.link };
});
