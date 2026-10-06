import { requireUser } from "#server/utils/require-user";
import { requireRoomMemberById } from "#server/utils/chat";
import { createTransferIceServers } from "#server/utils/turn";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "private, no-store");

  // Anonymous visitors have authenticated sessions too; both room members can relay.
  const user = await requireUser(event);
  await requireRoomMemberById(getRouterParam(event, "id") ?? "", user.id);
  const config = useRuntimeConfig(event);

  try {
    return { iceServers: createTransferIceServers(config.turnSecret, config.turnUrls, user.id) };
  }
  catch {
    throw createError({ statusCode: 503, statusMessage: "File connection configuration is unavailable." });
  }
});
