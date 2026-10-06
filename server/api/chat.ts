import { z } from "zod";
import { loadChatHistory, saveChatMessage } from "#server/utils/chat-messages";
import { auth } from "#server/utils/auth";
import { requireRoomMemberById } from "#server/utils/chat";
import { chatClientEventSchema } from "#server/utils/chat-events";
import { coordinateFileTransfer, registerTransferPeer, unregisterTransferPeer, enqueueRoomFileOperation, loadTransferHistory } from "#server/utils/chat-transfers";
import type { FileClientEvent } from "~~/shared/types/file-transfer";
import type { ChatServerEventData } from "~~/shared/types/chat";

export default defineWebSocketHandler({
  async upgrade(request) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return new Response("Sign in to continue.", { status: 401 });
    }

    const roomId = new URL(request.url).searchParams.get("room") ?? "";

    try {
      await requireRoomMemberById(roomId, session.user.id);
    }
    catch {
      return new Response("Room not found.", { status: 404 });
    }

    request.context.roomId = roomId;
    request.context.userId = session.user.id;
  },

  async open(peer) {
    const roomId = peer.context.roomId as string;

    registerTransferPeer(peer);
    // Subscribe before reading history so concurrent messages cannot fall in a gap.
    peer.subscribe(`room:${roomId}`);

    try {
      const [history, files] = await Promise.all([
        loadChatHistory(roomId),
        enqueueRoomFileOperation(roomId, () => loadTransferHistory(roomId)),
      ]);

      if (peer.context.transferClosed) return;
      peer.context.transferReady = true;
      peer.send({
        type: "ready",
        userId: peer.context.userId as string,
        messages: history,
        files,
      } satisfies ChatServerEventData);
    }
    catch (error) {
      console.error("Failed to load chat history.", error);
      peer.close(1011, "Unable to load conversation.");
    }
  },

  async message(peer, incoming) {
    let id: string | undefined;
    let isFileEvent = false;

    try {
      // Allow escaped JSON and multi-byte text, while bounding incoming payloads.
      if (incoming.uint8Array().byteLength > 128000) {
        throw new Error("Message too large.");
      }

      const raw = incoming.json();
      isFileEvent = Boolean(raw && typeof raw === "object" && "type" in raw && typeof raw.type === "string" && raw.type.startsWith("file-"));
      const parsed = chatClientEventSchema.safeParse(raw);

      if (raw && typeof raw === "object" && "id" in raw && typeof raw.id === "string") {
        id = z.string().uuid().safeParse(raw.id).success ? raw.id : undefined;
      }

      if (!parsed.success) {
        peer.send({
          type: isFileEvent ? "file-error" : "error",
          id: id ?? "",
          message: isFileEvent ? "Invalid file-transfer event." : "Enter a message of 1–10,000 characters.",
        } satisfies ChatServerEventData);
        return;
      }

      const roomId = peer.context.roomId as string;
      const userId = peer.context.userId as string;

      async function validateMembership() {
        // Recheck the cookie session and membership, including after expiry/sign-out.
        const session = await auth.api.getSession({ headers: peer.request.headers });
        if (session?.user.id !== userId) {
          peer.send({
            type: "error",
            message: "Your session ended. Reload to sign in again.",
            fatal: true,
          } satisfies ChatServerEventData);
          peer.close(1008, "Session ended.");
          return false;
        }

        await requireRoomMemberById(roomId, userId);
        return true;
      }

      if (parsed.data.type !== "message" && parsed.data.type !== "ping") {
        // Enqueue before any async auth reads so socket events retain arrival order.
        await enqueueRoomFileOperation(roomId, async () => {
          if (!peer.context.transferClosed && await validateMembership()) {
            await coordinateFileTransfer(peer, parsed.data as FileClientEvent);
          }
        });
        return;
      }
      if (!await validateMembership()) return;

      if (parsed.data.type === "ping") {
        peer.send({ type: "pong" } satisfies ChatServerEventData);
        return;
      }

      const record = await saveChatMessage(roomId, userId, parsed.data.id, parsed.data.body);

      const event = { type: "message", message: record } satisfies ChatServerEventData;
      peer.send(event);

      // CrossWS's Node adapter treats published objects as binary frames.
      peer.publish(`room:${roomId}`, JSON.stringify(event));
    }
    catch (error) {
      console.error("Failed to process chat message.", error);
      peer.send({
        type: isFileEvent ? "file-error" : "error",
        id: id ?? "",
        message: isFileEvent ? "File coordination failed. Please try again." : "Message couldn't be sent. Please try again.",
      } satisfies ChatServerEventData);
    }
  },
  async close(peer) {
    peer.context.transferClosed = true;
    await enqueueRoomFileOperation(peer.context.roomId as string, () => unregisterTransferPeer(peer));
  },
});
