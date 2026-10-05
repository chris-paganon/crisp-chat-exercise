import { createRoomSessions } from "@/lib/chat/room-sessions";
import { toast } from "vue-sonner";

export default defineNuxtPlugin((nuxtApp) => {
  const roomSessions = createRoomSessions({
    notify(transfer) {
      if (transfer.status === "completed") {
        toast.success(`${transfer.name} ${transfer.direction === "incoming" ? "received" : "sent"}.`, {
          description: transfer.direction === "incoming" ? "Open the conversation to download your file." : undefined,
        });
      }
      else if (transfer.status === "interrupted") {
        toast.warning(`${transfer.name}: transfer paused.`, {
          description: "Open the conversation to resume. Saved progress is kept.",
        });
      }
      else {
        toast.error(`${transfer.name}: transfer failed.`, { description: transfer.message });
      }
    },
  });

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
