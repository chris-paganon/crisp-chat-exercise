/** Attach a conversation view without owning the room's transport lifecycle. */
export function useRoomSession(roomId: string) {
  const { $roomSessions } = useNuxtApp();
  const session = $roomSessions.acquire(roomId);

  onMounted(session.chat.connect);
  onBeforeUnmount(() => $roomSessions.release(session));

  return session;
}
