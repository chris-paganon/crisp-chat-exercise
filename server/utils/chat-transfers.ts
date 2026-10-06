import type { FileClientEvent, FileRecordRow, FileServerEventData } from "~~/shared/types/file-transfer";
import { isFileTerminal, MAX_CONCURRENT_TRANSFERS } from "~~/shared/types/file-transfer";
import { findFileRecord, loadFileHistory, saveFileOffer, updateFileRecord } from "./file-records";
import { requireRoomMemberById } from "./chat";

interface TransferPeer {
  id: string;
  context: Record<string, unknown>;
  send: (data: unknown) => unknown;
}
interface LiveTransfer {
  record: FileRecordRow;
  sender?: TransferPeer;
  receiver?: TransferPeer;
  offset: number;
  attempt?: string;
  timer?: ReturnType<typeof setTimeout>;
}

// Only live sockets and negotiation belong to this server process.
const rooms = new Map<string, Set<TransferPeer>>();
const transfers = new Map<string, LiveTransfer>();
const operations = new Map<string, Promise<unknown>>();

export function enqueueRoomFileOperation<T>(roomId: string, work: () => Promise<T>): Promise<T> {
  const result = (operations.get(roomId) ?? Promise.resolve()).catch(() => {}).then(work);
  operations.set(roomId, result);
  void result.finally(() => {
    if (operations.get(roomId) === result) {
      operations.delete(roomId);
    }
  }).catch(() => {});
  return result;
}

export function registerTransferPeer(peer: TransferPeer) {
  const roomId = peer.context.roomId as string;
  const peers = rooms.get(roomId) ?? new Set<TransferPeer>();
  peers.add(peer);
  rooms.set(roomId, peers);
}

export function broadcastFileRecord(record: FileRecordRow) {
  for (const peer of rooms.get(record.roomId) ?? []) {
    if (peer.context.transferReady && !peer.context.transferClosed) {
      peer.send({ type: "file-record", record } satisfies FileServerEventData);
    }
  }
}

function discard(id: string) {
  const current = transfers.get(id);
  clearTimeout(current?.timer);
  transfers.delete(id);
}

async function pause(current: LiveTransfer, message: string) {
  discard(current.record.id);
  if (!isFileTerminal(current.record.status)) {
    const status = current.record.status === "offered" ? "offered" : "interrupted";
    broadcastFileRecord(await updateFileRecord(current.record.roomId, current.record.id, status, message));
  }
}

export async function unregisterTransferPeer(peer: TransferPeer) {
  const roomId = peer.context.roomId as string;
  const peers = rooms.get(roomId);
  peers?.delete(peer);
  if (!peers?.size) {
    rooms.delete(roomId);
  }

  for (const current of [...transfers.values()]) {
    if (current.sender?.id === peer.id || current.receiver?.id === peer.id) {
      await pause(current, "The other participant disconnected. Reopen both conversations to resume.");
    }
  }
  await startQueued(roomId);
}

function createLive(record: FileRecordRow) {
  const current: LiveTransfer = { record, offset: 0 };
  transfers.set(record.id, current);
  waitForPeer(current);
  return current;
}

function waitForPeer(current: LiveTransfer) {
  // Consent can take arbitrarily long; bound readiness only after acceptance.
  if (current.record.status === "offered" || current.timer || current.attempt) return;

  const { record } = current;
  current.timer = setTimeout(() => {
    void enqueueRoomFileOperation(record.roomId, async () => {
      if (transfers.get(record.id) === current && !current.attempt) {
        await pause(current, "Waiting for the other participant. Resume when both sides are ready.");
        await startQueued(record.roomId);
      }
    }).catch(console.error);
  }, 120000);
}

async function startQueued(roomId: string) {
  const roomTransfers = [...transfers.values()].filter(item => item.record.roomId === roomId);
  let running = roomTransfers.filter(item => item.attempt).length;
  for (const current of roomTransfers) {
    if (current.attempt || !current.sender || !current.receiver || current.record.status === "offered") {
      continue;
    }
    if (current.sender.context.transferClosed || current.receiver.context.transferClosed) {
      continue;
    }

    // Both ends are ready: queueing behind a large file must not expire this transfer.
    clearTimeout(current.timer);
    current.timer = undefined;
    if (running >= MAX_CONCURRENT_TRANSFERS) {
      continue;
    }

    current.record = await updateFileRecord(roomId, current.record.id, "accepted");
    current.attempt = crypto.randomUUID();
    broadcastFileRecord(current.record);
    const event = { type: "file-start", id: current.record.id, offset: current.offset, attempt: current.attempt } satisfies FileServerEventData;
    // Both ends have already prepared resources before advertising readiness.
    current.receiver.send(event);
    current.sender.send(event);
    running++;
  }
}

export async function coordinateFileTransfer(peer: TransferPeer, event: FileClientEvent) {
  const roomId = peer.context.roomId as string;
  const userId = peer.context.userId as string;
  const error = (message: string) => peer.send({
    type: "file-error", id: event.id, message, attempt: "attempt" in event ? event.attempt : undefined,
  } satisfies FileServerEventData);

  if (event.type === "file-offer") {
    const room = await requireRoomMemberById(roomId, userId);
    if (!room.operatorId) return error("An operator must join this conversation before you can offer a file.");

    const receiverId = userId === room.visitorId ? room.operatorId : room.visitorId;
    const existing = await findFileRecord(roomId, event.id);

    if (!existing && [...transfers.values()].filter(item => item.record.roomId === roomId).length >= 32) {
      return error("Too many pending files. Finish or cancel some transfers first.");
    }

    const record = await saveFileOffer(roomId, userId, receiverId, event);
    broadcastFileRecord(record);
    if (isFileTerminal(record.status)) return;

    const current = transfers.get(event.id) ?? createLive(record);
    if (current.sender && current.sender.id !== peer.id) return error("This file is being sent from another tab.");

    current.sender = peer;
    await startQueued(roomId);
    return;
  }

  const record = await findFileRecord(roomId, event.id);
  if (!record || (record.senderId !== userId && record.receiverId !== userId)) {
    return error("This file offer is not available in this conversation.");
  }
  const sender = record.senderId === userId;
  const current = transfers.get(event.id);
  const owner = sender ? current?.sender : current?.receiver;
  if (owner && owner.id !== peer.id) return error("This transfer is active in another tab.");
  if (isFileTerminal(record.status)) {
    peer.send({ type: "file-record", record } satisfies FileServerEventData);
    return;
  }

  switch (event.type) {
    case "file-accept":
    case "file-resume": {
      if (event.offset > record.size || (sender && event.offset !== 0)) return error("Invalid resume offset.");
      if (event.type === "file-accept" && sender) return error("Only the recipient can accept a file.");
      if (event.type === "file-resume" && !sender && record.status === "offered") return error("Accept the file before receiving it.");
      if (current?.attempt) return;

      const live = current ?? createLive(record);
      if (!sender && event.type === "file-accept") {
        live.record = await updateFileRecord(roomId, event.id, "accepted");
        broadcastFileRecord(live.record);
      }
      if (sender) {
        live.sender = peer;
      }
      else {
        live.receiver = peer;
        live.offset = event.offset;
      }
      peer.send({ type: "file-waiting", id: event.id } satisfies FileServerEventData);
      for (const other of rooms.get(roomId) ?? []) {
        if (other.context.userId !== userId && other.context.transferReady && !other.context.transferClosed) {
          other.send({ type: "file-wake", id: event.id } satisfies FileServerEventData);
        }
      }
      waitForPeer(live);
      await startQueued(roomId);
      break;
    }
    case "file-signal": {
      if (!current?.attempt || event.attempt !== current.attempt) return;
      if (!current.sender || !current.receiver) return;
      if ("description" in event.signal && event.signal.description.type !== (sender ? "offer" : "answer")) {
        return error("Unexpected connection description.");
      }
      (sender ? current.receiver : current.sender).send(event);
      break;
    }
    case "file-pause":
      if (current && (!event.attempt || event.attempt === current.attempt)) {
        await pause(current, "Transfer interrupted. Resume when both sides are ready.");
        await startQueued(roomId);
      }
      break;
    case "file-decline":
      if (sender || record.status !== "offered") return error("This offer cannot be declined.");
      discard(event.id);
      broadcastFileRecord(await updateFileRecord(roomId, event.id, "declined"));
      await startQueued(roomId);
      break;
    case "file-cancel":
      discard(event.id);
      broadcastFileRecord(await updateFileRecord(roomId, event.id, "cancelled"));
      await startQueued(roomId);
      break;
    case "file-fail":
      if (event.attempt && event.attempt !== current?.attempt) return;
      discard(event.id);
      broadcastFileRecord(await updateFileRecord(roomId, event.id, "failed", event.message));
      await startQueued(roomId);
      break;
    case "file-finish":
      if (sender || record.status === "offered") return error("Only an accepted recipient can confirm receipt.");
      // A verified completed local file can reconcile a lost receipt after reload.
      if ((current?.attempt || event.attempt) && current?.attempt !== event.attempt) return;
      discard(event.id);
      broadcastFileRecord(await updateFileRecord(roomId, event.id, "completed"));
      await startQueued(roomId);
      break;
  }
}

export async function loadTransferHistory(roomId: string) {
  const records = await loadFileHistory(roomId);
  return Promise.all(records.map(async (record) => {
    if (record.status === "accepted" && !transfers.has(record.id)) {
      return updateFileRecord(roomId, record.id, "interrupted", "Transfer interrupted. Reopen both conversations to resume.");
    }
    return record;
  }));
}
