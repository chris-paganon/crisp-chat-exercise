import type { ChatConnection } from "./useChatConnection";
import type { ChatMessage } from "~~/shared/types/chat";
import { MAX_CHAT_MESSAGE_LENGTH } from "~~/shared/types/chat";

interface DisplayMessage extends ChatMessage {
  status: "sending" | "sent" | "failed";
  error?: string;
}

export function useChatMessages(roomId: string, chat: ChatConnection) {
  const messages = useState<DisplayMessage[]>(`chat-messages:${roomId}`, () => []);
  const { userId, connection } = chat;
  // Client IDs correlate optimistic messages with persisted acknowledgements.
  const acknowledgements = new Map<string, ReturnType<typeof setTimeout>>();

  const unsubscribe = chat.onEvent((event) => {
    if (event.type === "ready") event.messages.forEach(merge);
    if (event.type === "message") merge(event.message);
    if (event.type === "error" && event.id) fail(event.id, event.message);
  });

  watch(connection, (state) => {
    if (state !== "connected") {
      for (const id of acknowledgements.keys()) {
        fail(id, "Connection lost. Try again once connected.");
      }
    }
  });

  onBeforeUnmount(() => {
    unsubscribe();
    for (const id of acknowledgements.keys()) {
      fail(id, "Send interrupted. Please try again.");
    }
  });

  function merge(record: ChatMessage) {
    if (record.roomId !== roomId) {
      return;
    }

    if (record.senderId === userId.value) {
      clearTimeout(acknowledgements.get(record.id));
      acknowledgements.delete(record.id);
    }

    const index = messages.value.findIndex(item => item.id === record.id);
    const item: DisplayMessage = { ...record, status: "sent" };

    if (index === -1) {
      messages.value.push(item);
    }
    else {
      messages.value[index] = item;
    }
  }

  function fail(id: string, reason: string) {
    clearTimeout(acknowledgements.get(id));
    acknowledgements.delete(id);

    updateMessageStatus(id, "failed", reason);
  }

  function updateMessageStatus(id: string, status: "sending" | "failed", error?: string) {
    const index = messages.value.findIndex(item => item.senderId === userId.value && item.id === id);
    const item = messages.value[index];
    if (item && item.status !== "sent") {
      messages.value[index] = { ...item, status, error };
    }
  }

  function waitForAcknowledgement(id: string) {
    clearTimeout(acknowledgements.get(id));
    acknowledgements.set(id, setTimeout(() => {
      fail(id, "No confirmation received. Try again.");
    }, 10000));
  }

  // Public functions
  function send(body: string) {
    const text = body.trim();

    if (connection.value !== "connected" || !text || text.length > MAX_CHAT_MESSAGE_LENGTH) {
      return false;
    }

    const id = crypto.randomUUID();
    const item: DisplayMessage = {
      id,
      roomId,
      senderId: userId.value,
      body: text,
      createdAt: new Date(),
      status: "sending",
    };
    messages.value.push(item);

    waitForAcknowledgement(id);
    if (!sendItem(item)) {
      fail(id, "Connection lost. Please try again.");
    }
    return true;
  }

  function retry(id: string) {
    if (connection.value !== "connected") {
      return;
    }

    const item = messages.value.find(item => item.senderId === userId.value && item.id === id);
    if (item?.status === "failed") {
      updateMessageStatus(id, "sending");
      waitForAcknowledgement(id);
      if (!sendItem(item)) {
        fail(id, "Connection lost. Please try again.");
      }
    }
  }

  function sendItem(item: Readonly<Pick<ChatMessage, "id" | "body">>) {
    try {
      chat.transmit({
        type: "message",
        id: item.id,
        body: item.body,
      });
      return true;
    }
    catch {
      return false;
    }
  }

  return { messages, send, retry };
}
