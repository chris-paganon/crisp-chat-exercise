import type { FileClientEvent, FileEndStatus, FileServerEvent } from "~~/shared/types/file-transfer";

// Only the socket properties coordination needs; no adapter dependency.
interface TransferPeer {
  id: string;
  context: Record<string, unknown>;
  send: (data: unknown) => unknown;
}
interface LiveTransfer {
  offer: Extract<FileServerEvent, { type: "file-offered" }>;
  sender: TransferPeer;
  receiver: TransferPeer;
  accepted: boolean;
  timer: ReturnType<typeof setTimeout>;
}

// Live coordination belongs to this server process, not persisted chat history.
const rooms = new Map<string, Set<TransferPeer>>();
const transfers = new Map<string, LiveTransfer>();

export function registerTransferPeer(peer: TransferPeer) {
  const roomId = peer.context.roomId as string;
  const peers = rooms.get(roomId) ?? new Set<TransferPeer>();
  peers.add(peer);
  rooms.set(roomId, peers);
}

export function unregisterTransferPeer(peer: TransferPeer) {
  const roomId = peer.context.roomId as string;
  const peers = rooms.get(roomId);
  peers?.delete(peer);
  if (!peers?.size) rooms.delete(roomId);
  for (const [id, transfer] of transfers) {
    if (transfer.sender.id === peer.id || transfer.receiver.id === peer.id) {
      end(id, "failed", "The other participant left the conversation.", peer.id);
    }
  }
}

function end(id: string, status: FileEndStatus, message?: string, closedPeerId?: string) {
  const transfer = transfers.get(id);
  if (!transfer) return;
  transfers.delete(id);
  clearTimeout(transfer.timer);
  const event = { type: "file-ended", id: transfer.offer.id, status, message } satisfies FileServerEvent;
  for (const peer of [transfer.sender, transfer.receiver]) {
    if (peer.id !== closedPeerId) peer.send(event);
  }
}

export function coordinateFileTransfer(peer: TransferPeer, event: FileClientEvent) {
  const roomId = peer.context.roomId as string;
  const fail = (message: string) => peer.send({ type: "file-error", id: event.id, message } satisfies FileServerEvent);
  const current = transfers.get(event.id);

  if (event.type === "file-offer") {
    if (current) return fail("This file offer already exists.");

    const active = [...transfers.values()].filter(item => item.sender.context.roomId === roomId);
    if (active.length >= 3) return fail("Three files can transfer at once. Wait for one to finish.");
    const receiver = [...(rooms.get(roomId) ?? [])].find(other =>
      other.context.userId !== peer.context.userId && other.context.transferReady);
    if (!receiver) return fail("The other participant must have this conversation open.");
    const offer = { ...event, type: "file-offered", senderId: peer.context.userId as string } satisfies FileServerEvent;
    const timer = setTimeout(() => end(event.id, "failed", "The file offer expired."), 120000);
    transfers.set(event.id, { offer, sender: peer, receiver, accepted: false, timer });
    receiver.send(offer);
    peer.send(offer);
    return;
  }

  if (!current || current.sender.context.roomId !== roomId) return fail("This transfer is no longer active.");
  const isSender = current.sender.id === peer.id;
  const isReceiver = current.receiver.id === peer.id;
  if (!isSender && !isReceiver) return fail("This transfer belongs to another tab.");

  switch (event.type) {
    case "file-accept":
      if (!isReceiver || current.accepted) return fail("This offer cannot be accepted.");
      current.accepted = true;
      clearTimeout(current.timer);
      current.sender.send({ type: "file-accepted", id: event.id } satisfies FileServerEvent);
      current.receiver.send({ type: "file-accepted", id: event.id } satisfies FileServerEvent);
      break;
    case "file-decline":
      if (!isReceiver || current.accepted) return fail("This offer cannot be declined.");
      end(event.id, "declined");
      break;
    case "file-cancel":
      end(event.id, "cancelled");
      break;
    case "file-fail":
      end(event.id, "failed", event.message);
      break;
    case "file-finish":
      if (!isReceiver || !current.accepted) return fail("This transfer cannot be completed.");
      end(event.id, "completed");
      break;
    case "file-signal": {
      if (!current.accepted) return fail("Accept the offer before connecting.");
      if ("description" in event.signal && event.signal.description.type !== (isSender ? "offer" : "answer")) {
        return fail("Unexpected connection description.");
      }
      (isSender ? current.receiver : current.sender).send(event);
      break;
    }
  }
}
