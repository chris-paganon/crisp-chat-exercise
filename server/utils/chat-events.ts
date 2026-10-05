import { z } from "zod";
import { MAX_CHAT_MESSAGE_LENGTH } from "~~/shared/types/chat";

const id = z.string().uuid();
const offset = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const attempt = z.string().uuid().optional();
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
  z.object({ type: z.literal("file-offer"), id, name: z.string().min(1).max(255), size: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), mime: z.string().max(255), fingerprint: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({ type: z.literal("file-accept"), id, offset }),
  z.object({ type: z.literal("file-decline"), id }),
  z.object({ type: z.literal("file-cancel"), id }),
  z.object({ type: z.literal("file-finish"), id, attempt }),
  z.object({ type: z.literal("file-resume"), id, offset }),
  z.object({ type: z.literal("file-pause"), id, attempt }),
  z.object({ type: z.literal("file-fail"), id, attempt, message: z.string().min(1).max(500) }),
  z.object({ type: z.literal("file-signal"), id, attempt: z.string().uuid(), signal }),
]);
