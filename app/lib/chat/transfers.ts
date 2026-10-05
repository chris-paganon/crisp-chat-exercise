import { computed, ref, watch } from "vue";
import type { ChatConnection } from "./connection";
import type { FileServerEvent } from "~~/shared/types/file-transfer";
import type { TransferView } from "@/lib/file-transfer/model";
import { isTransferActive } from "@/lib/file-transfer/model";
import { createTransferManager } from "@/lib/file-transfer/manager";

export function createFileTransfers(chat: ChatConnection) {
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

  const stopWatching = watch(chat.connection, (state) => {
    if (state !== "connected") {
      manager.disconnect();
    }
  }, { flush: "sync" });

  function dispose() {
    unsubscribe();
    stopWatching();
    manager.dispose();
  }

  return { transfers, busy, ...manager, dispose };
}
