import { summarizeTransfers } from "@/lib/file-transfer/model";

/** Observe retained rooms without attaching a conversation or opening a socket. */
export function useRoomTransferSummaries() {
  const { $roomSessions } = useNuxtApp();

  return computed(() => new Map($roomSessions.sessions.value.map(session => [
    session.roomId,
    summarizeTransfers(session.files.transfers.value),
  ])));
}
