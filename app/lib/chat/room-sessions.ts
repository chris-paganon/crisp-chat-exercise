import { effectScope, onScopeDispose, ref, shallowRef, watch } from "vue";
import type { Ref } from "vue";
import { createChatConnection } from "./connection";
import { createChatMessages } from "./messages";
import { createFileTransfers } from "./transfers";
import type { TransferView } from "../file-transfer/model";

interface RoomSessionsOptions {
  notify?: (transfer: TransferView) => void;
}

/** One registry per Nuxt app; sockets, peers and files never enter serialized state. */
export function createRoomSessions(options: RoomSessionsOptions = {}) {
  const entries = new Map<string, ReturnType<typeof createEntry>>();
  const sessions = shallowRef<RoomSession[]>([]);
  let suspended = false;

  function createEntry(roomId: string) {
    // A detached scope survives conversation component unmounts.
    const scope = effectScope(true);
    const session = scope.run(() => {
      const chat = createChatConnection(roomId);
      const messages = createChatMessages(roomId, chat);
      const files = createFileTransfers(roomId, chat);
      const views = ref(0);

      watch(files.transfers, (items, previous) => {
        if (views.value || suspended) return;

        for (const item of items) {
          if ((item.status === "completed" || item.status === "failed")
            && previous.find(old => old.id === item.id)?.status !== item.status) {
            options.notify?.(item);
          }
        }
      }, { flush: "sync" });

      watch(files.busy, (busy) => {
        if (!views.value && !busy) {
          chat.close();
        }
      }, { flush: "sync" });

      watch(chat.sessionEnded, (ended) => {
        if (ended) {
          clear();
        }
      }, { flush: "post" });

      onScopeDispose(() => {
        // Notify the peer before disposing the signaling socket.
        files.dispose();
        messages.dispose();
        chat.dispose();
      });

      return { roomId, chat, messages, files, views };
    })!;

    return { session, dispose: () => scope.stop() };
  }

  function acquire(roomId: string) {
    let entry = entries.get(roomId);
    if (!entry) {
      entry = createEntry(roomId);
      entries.set(roomId, entry);
      sessions.value = [...entries.values()].map(item => item.session);
    }

    entry.session.views.value++;
    return entry.session;
  }

  function release(session: RoomSession) {
    session.views.value = Math.max(0, session.views.value - 1);
    if (!session.views.value && !session.files.busy.value) {
      session.chat.close();
    }
  }

  function clear() {
    const previous = [...entries.values()];
    entries.clear();
    sessions.value = [];
    previous.forEach(entry => entry.dispose());
  }

  function suspend() {
    suspended = true;
    for (const { session } of entries.values()) {
      session.files.disconnect();
      session.chat.close();
    }
  }

  function resume() {
    suspended = false;
    for (const { session } of entries.values()) {
      if (session.views.value || session.files.busy.value) {
        session.chat.connect();
      }
    }
  }

  return { sessions, acquire, release, clear, suspend, resume };
}

export interface RoomSession {
  roomId: string;
  chat: ReturnType<typeof createChatConnection>;
  messages: ReturnType<typeof createChatMessages>;
  files: ReturnType<typeof createFileTransfers>;
  views: Ref<number>;
}
