import { getRoomSummary, requireRoomMember } from "#server/utils/chat";

export default defineEventHandler(async (event) => {
  const room = await requireRoomMember(event);
  return getRoomSummary(room.id);
});
