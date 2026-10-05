import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "#server/db";
import { message } from "#server/db/schema";
import { auth } from "#server/utils/auth";
import { requireRoomMemberById } from "#server/utils/chat";
import { MAX_CHAT_MESSAGE_LENGTH } from "~~/shared/types/chat";
import type { ChatMessage, ChatServerEvent } from "~~/shared/types/chat";

const clientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }),
  z.object({
    type: z.literal("message"),
    clientId: z.string().uuid(),
    body: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
  }),
]);

function serializeMessage(record: typeof message.$inferSelect): ChatMessage {
  return {
    id: record.id,
    roomId: record.roomId,
    senderId: record.senderId,
    clientId: record.clientId,
    body: record.body,
    createdAt: record.createdAt.toISOString(),
  };
}

export default defineWebSocketHandler({
  async upgrade(request) {
    if (request.headers.get("origin") !== new URL(useRuntimeConfig().betterAuthUrl).origin) {
      return new Response("Invalid request origin.", { status: 403 });
    }
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return new Response("Sign in to continue.", { status: 401 });
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
    // Subscribe before reading history so concurrent messages cannot fall in a gap.
    peer.subscribe(`room:${roomId}`);
    try {
      const history = await getDb().select().from(message)
        .where(eq(message.roomId, roomId)).orderBy(asc(message.createdAt), asc(message.id));
      peer.send({
        type: "ready",
        userId: peer.context.userId as string,
        messages: history.map(serializeMessage),
      } satisfies ChatServerEvent);
    }
    catch (error) {
      console.error("Failed to load chat history.", error);
      peer.close(1011, "Unable to load conversation.");
    }
  },

  async message(peer, incoming) {
    let clientId: string | undefined;
    try {
      // Allow escaped JSON and multi-byte text, while bounding incoming payloads.
      if (incoming.uint8Array().byteLength > 128000) throw new Error("Message too large.");
      const raw = incoming.json();
      const parsed = clientEventSchema.safeParse(raw);
      if (raw && typeof raw === "object" && "clientId" in raw && typeof raw.clientId === "string") {
        clientId = z.string().uuid().safeParse(raw.clientId).success ? raw.clientId : undefined;
      }
      if (!parsed.success) {
        peer.send({ type: "error", clientId, message: "Enter a message of 1–10,000 characters." } satisfies ChatServerEvent);
        return;
      }
      const roomId = peer.context.roomId as string;
      const userId = peer.context.userId as string;
      // Recheck the cookie session and membership, including on heartbeat, after expiry/sign-out.
      const session = await auth.api.getSession({ headers: peer.request.headers });
      if (session?.user.id !== userId) {
        peer.send({ type: "error", message: "Your session ended. Reload to sign in again.", fatal: true } satisfies ChatServerEvent);
        peer.close(1008, "Session ended.");
        return;
      }
      await requireRoomMemberById(roomId, userId);
      if (parsed.data.type === "ping") {
        peer.send({ type: "pong" } satisfies ChatServerEvent);
        return;
      }

      const db = getDb();
      const [inserted] = await db.insert(message).values({
        id: crypto.randomUUID(),
        roomId,
        senderId: userId,
        clientId: parsed.data.clientId,
        body: parsed.data.body,
      }).onConflictDoNothing({ target: [message.roomId, message.senderId, message.clientId] }).returning();
      // A retry returns the original persisted message, even if the acknowledgement was lost.
      const record = inserted ?? (await db.select().from(message).where(and(
        eq(message.roomId, roomId),
        eq(message.senderId, userId),
        eq(message.clientId, parsed.data.clientId),
      )))[0];
      if (!record) throw new Error("Message was not saved.");
      const event = { type: "message", message: serializeMessage(record) } satisfies ChatServerEvent;
      peer.send(event);
      peer.publish(`room:${roomId}`, event);
    }
    catch (error) {
      console.error("Failed to process chat message.", error);
      peer.send({ type: "error", clientId, message: "Message couldn't be sent. Please try again." } satisfies ChatServerEvent);
    }
  },
});
