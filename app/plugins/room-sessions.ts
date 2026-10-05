import { createRoomSessions } from "@/lib/chat/room-sessions";

export default defineNuxtPlugin((nuxtApp) => {
  const roomSessions = createRoomSessions();

  function dispose() {
    if (import.meta.client) {
      window.removeEventListener("pagehide", roomSessions.suspend);
      window.removeEventListener("pageshow", roomSessions.resume);
    }
    roomSessions.clear();
  }

  nuxtApp.vueApp.onUnmount(dispose);

  if (import.meta.client) {
    window.addEventListener("pagehide", roomSessions.suspend);
    window.addEventListener("pageshow", roomSessions.resume);

    if (import.meta.hot) {
      import.meta.hot.dispose(dispose);
    }
  }

  return { provide: { roomSessions } };
});
