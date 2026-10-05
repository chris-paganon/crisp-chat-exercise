import type { ChatConnection } from "./useChatConnection";
import type { FileServerEvent } from "~~/shared/types/file-transfer";
import type { TransferView } from "@/lib/file-transfer/model";
import { isTransferActive } from "@/lib/file-transfer/model";
import { createTransferManager } from "@/lib/file-transfer/manager";

export function useFileTransfers(chat: ChatConnection) {
  const transfers = ref<TransferView[]>([]);
  const busy = computed(() => transfers.value.some(isTransferActive));

  const manager = createTransferManager({
    userId: () => chat.userId.value,
    send: chat.transmit,
    changed: (items) => { transfers.value = items; },
  });
  const unsubscribe = chat.onEvent((event) => {
    if (event.type.startsWith("file-")) {
      manager.receiveServerEvent(event as FileServerEvent);
    }
  });

  watch(chat.connection, (state) => {
    if (state !== "connected") {
      manager.disconnect();
    }
  }, { flush: "sync" });

  // Best effort on normal navigation; the server also detects abrupt socket closure.
  onMounted(() => window.addEventListener("pagehide", manager.disconnect));
  onBeforeUnmount(() => {
    unsubscribe();
    window.removeEventListener("pagehide", manager.disconnect);
    manager.dispose();
  });

  return { transfers, busy, ...manager };
}
