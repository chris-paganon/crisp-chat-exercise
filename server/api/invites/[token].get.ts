import { findInvite, getRoomSummary } from "#server/utils/chat";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  const record = await findInvite(event);
  return { room: await getRoomSummary(record.room.id), joined: Boolean(record.room.visitorId) };
});
