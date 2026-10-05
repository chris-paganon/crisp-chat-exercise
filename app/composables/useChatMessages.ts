import { toast } from "vue-sonner";
import type { ChatClientEvent, ChatMessage, ChatServerEvent } from "~~/shared/types/chat";
import { MAX_CHAT_MESSAGE_LENGTH } from "~~/shared/types/chat";

interface DisplayMessage extends ChatMessage {
  status: "sending" | "sent" | "failed";
  error?: string;
}

export function useChatMessages(roomId: string) {
  const messages = useState<DisplayMessage[]>(`chat-messages:${roomId}`, () => []);
  const userId = ref("");
  const connection = ref<"connecting" | "connected" | "reconnecting" | "closed">("connecting");
  const errorToastId = `chat-error:${roomId}`;

  let socket: WebSocket | undefined;
  let disposed = false;
  let stopped = false;
  let attempts = 0;

  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let connectionTimer: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let pongTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   *  Aknowledgments manage optimistic updates, retries and failures.
   *  When a message is sent, it is added to the acknowledgements map with a timeout.
   *  When the message is received by the server, the timeout is cleared in merge()
   */
  const acknowledgements = new Map<string, ReturnType<typeof setTimeout>>();

  onMounted(connect);
  onBeforeUnmount(() => {
    disposed = true;
    toast.dismiss(errorToastId);
    clearTimeout(reconnectTimer);
    clearConnectionTimers();

    for (const id of acknowledgements.keys()) {
      fail(id, "Send interrupted. Please try again.");
    }

    socket?.close(1000, "Conversation closed.");
  });

  function connect() {
    if (disposed || stopped) {
      return;
    }

    clearTimeout(reconnectTimer);
    connection.value = attempts ? "reconnecting" : "connecting";

    const url = new URL("/api/chat", window.location.href);
    url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("room", roomId);

    const current = new WebSocket(url);
    socket = current;

    // Includes the history handshake, not just the HTTP upgrade.
    connectionTimer = setTimeout(() => current.close(), 10000);

    current.onmessage = incoming => handleMessage(current, incoming);
    current.onerror = () => current.close();
    current.onclose = event => handleClose(current, event);
  }

  function handleMessage(current: WebSocket, incoming: MessageEvent) {
    if (socket !== current || disposed) {
      return;
    }

    try {
      // JSON serializes dates as strings; restore them at the WebSocket boundary.
      const event = JSON.parse(incoming.data, (key, value) =>
        key === "createdAt" && typeof value === "string" ? new Date(value) : value) as ChatServerEvent;

      switch (event.type) {
        case "ready": {
          userId.value = event.userId;

          for (const record of event.messages) {
            merge(record);
          }

          connection.value = "connected";
          toast.dismiss(errorToastId);
          attempts = 0;
          clearTimeout(connectionTimer);
          clearInterval(heartbeat);

          heartbeat = setInterval(() => {
            try {
              transmit({ type: "ping" });
              pongTimer = setTimeout(() => current.close(), 10000);
            }
            catch {
              current.close();
            }
          }, 15000);
          break;
        }
        case "message":
          merge(event.message);
          break;
        case "pong":
          clearTimeout(pongTimer);
          break;
        case "error": {
          if (event.id) {
            fail(event.id, event.message);
          }

          if (!event.id || event.fatal) {
            toast.error(event.message, {
              id: errorToastId,
            });
          }

          if (event.fatal) {
            stopped = true;
            current.close();
          }
          break;
        }
      }
    }
    catch {
      toast.error("Couldn't read the conversation. Reconnecting…", { id: errorToastId });
      current.close();
    }
  }

  function handleClose(current: WebSocket, event: CloseEvent) {
    if (socket !== current || disposed) {
      return;
    }

    socket = undefined;
    clearConnectionTimers();

    for (const id of acknowledgements.keys()) {
      fail(id, "Connection lost. Try again once connected.");
    }

    if (!stopped && event.code === 1008) {
      toast.error("Your session ended. Reload to sign in again.", {
        id: errorToastId,
        duration: Infinity,
      });
      stopped = true;
    }

    if (stopped) {
      connection.value = "closed";
      return;
    }

    connection.value = "reconnecting";
    const delay = Math.min(1000 * 2 ** attempts++, 15000);
    reconnectTimer = setTimeout(connect, delay);
  }

  // Methods
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

  function clearConnectionTimers() {
    clearTimeout(connectionTimer);
    clearInterval(heartbeat);
    clearTimeout(pongTimer);
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
      transmit({
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

  // Websocket helpers
  function transmit(event: ChatClientEvent) {
    if (socket?.readyState !== WebSocket.OPEN) {
      throw new Error("Connection unavailable.");
    }

    socket.send(JSON.stringify(event));
  }

  return { messages, userId, connection, send, retry };
}
