import { z } from "zod";
import { MAX_CHAT_MESSAGE_LENGTH } from "~~/shared/types/chat";

const id = z.string().uuid();
const signal = z.union([
  z.object({ description: z.object({ type: z.enum(["offer", "answer"]), sdp: z.string().max(64000) }) }),
  z.object({ candidate: z.object({
    candidate: z.string().max(4096),
    sdpMid: z.string().max(256).nullable(),
    sdpMLineIndex: z.number().int().min(0).max(65535).nullable(),
  }).nullable() }),
]);

export const chatClientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }),
  z.object({ type: z.literal("message"), id, body: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_LENGTH) }),
  z.object({ type: z.literal("file-offer"), id, name: z.string().min(1).max(255), size: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), mime: z.string().max(255) }),
  z.object({ type: z.literal("file-accept"), id }),
  z.object({ type: z.literal("file-decline"), id }),
  z.object({ type: z.literal("file-cancel"), id }),
  z.object({ type: z.literal("file-finish"), id }),
  z.object({ type: z.literal("file-fail"), id, message: z.string().min(1).max(500) }),
  z.object({ type: z.literal("file-signal"), id, signal }),
]);
