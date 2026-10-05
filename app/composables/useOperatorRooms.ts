import type { ChatRoom } from "~~/shared/types/chat";

export function useOperatorRooms() {
  return useFetch<ChatRoom[]>("/api/rooms", {
    key: "operator-rooms",
    default: () => [],
  });
}
