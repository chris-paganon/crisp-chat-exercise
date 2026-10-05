import { toast } from "vue-sonner";
import type { ChatClientEvent, ChatMessage, ChatServerEvent } from "~~/shared/types/chat";
import { MAX_CHAT_MESSAGE_LENGTH } from "~~/shared/types/chat";

interface DisplayMessage extends ChatMessage {
  status: "sending" | "sent" | "failed";
  error?: string;
}

export function useChatMessages(roomId: string) {
  // Keep unsent messages when changing rooms or closing/reopening the widget.
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
  const acknowledgements = new Map<string, ReturnType<typeof setTimeout>>();

  function fail(clientId: string, reason: string) {
    clearTimeout(acknowledgements.get(clientId));
    acknowledgements.delete(clientId);
    const item = messages.value.find(item => item.senderId === userId.value && item.clientId === clientId);
    if (item && item.status !== "sent") {
      item.status = "failed";
      item.error = reason;
    }
  }

  function merge(record: ChatMessage) {
    if (record.roomId !== roomId) return;
    if (record.senderId === userId.value) {
      clearTimeout(acknowledgements.get(record.clientId));
      acknowledgements.delete(record.clientId);
    }
    const index = messages.value.findIndex(item => item.id === record.id
      || (item.clientId === record.clientId && item.senderId === record.senderId));
    const item: DisplayMessage = { ...record, status: "sent" };
    if (index === -1) messages.value.push(item);
    else messages.value[index] = item;
  }

  function transmit(event: ChatClientEvent) {
    if (socket?.readyState !== WebSocket.OPEN) throw new Error("Connection unavailable.");
    socket.send(JSON.stringify(event));
  }

  function clearConnectionTimers() {
    clearTimeout(connectionTimer);
    clearInterval(heartbeat);
    clearTimeout(pongTimer);
  }

  function connect() {
    if (disposed || stopped) return;
    clearTimeout(reconnectTimer);
    connection.value = attempts ? "reconnecting" : "connecting";
    const url = new URL("/api/chat", window.location.href);
    url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("room", roomId);
    const current = new WebSocket(url);
    socket = current;
    // Includes the history handshake, not just the HTTP upgrade.
    connectionTimer = setTimeout(() => current.close(), 10000);

    current.onmessage = (incoming) => {
      if (socket !== current || disposed) return;
      try {
        const event = JSON.parse(incoming.data) as ChatServerEvent;
        if (event.type === "ready") {
          userId.value = event.userId;
          for (const record of event.messages) merge(record);
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
            catch { current.close(); }
          }, 15000);
        }
        else if (event.type === "message") merge(event.message);
        else if (event.type === "pong") clearTimeout(pongTimer);
        else if (event.type === "error") {
          if (event.clientId) fail(event.clientId, event.message);
          if (!event.clientId || event.fatal) {
            toast.error(event.message, { id: errorToastId, duration: event.fatal ? Infinity : undefined });
          }
          if (event.fatal) {
            stopped = true;
            current.close();
          }
        }
      }
      catch {
        toast.error("Couldn't read the conversation. Reconnecting…", { id: errorToastId });
        current.close();
      }
    };
    current.onerror = () => current.close();
    current.onclose = (event) => {
      if (socket !== current || disposed) return;
      socket = undefined;
      clearConnectionTimers();
      for (const clientId of acknowledgements.keys()) fail(clientId, "Connection lost. Try again once connected.");
      if (!stopped && event.code === 1008) {
        toast.error("Your session ended. Reload to sign in again.", { id: errorToastId, duration: Infinity });
        stopped = true;
      }
      if (stopped) {
        connection.value = "closed";
        return;
      }
      connection.value = "reconnecting";
      const delay = Math.min(1000 * 2 ** attempts++, 15000);
      reconnectTimer = setTimeout(connect, delay);
    };
  }

  function sendItem(item: DisplayMessage) {
    if (connection.value !== "connected") return;
    item.status = "sending";
    item.error = undefined;
    clearTimeout(acknowledgements.get(item.clientId));
    acknowledgements.set(item.clientId, setTimeout(() => {
      fail(item.clientId, "No confirmation received. Try again.");
    }, 10000));
    try {
      transmit({ type: "message", clientId: item.clientId, body: item.body });
    }
    catch { fail(item.clientId, "Connection lost. Please try again."); }
  }

  function send(body: string) {
    const text = body.trim();
    if (connection.value !== "connected" || !text || text.length > MAX_CHAT_MESSAGE_LENGTH) return false;
    const clientId = crypto.randomUUID();
    messages.value.push({
      id: clientId,
      clientId,
      roomId,
      senderId: userId.value,
      body: text,
      createdAt: new Date().toISOString(),
      status: "sending",
    });
    sendItem(messages.value[messages.value.length - 1]!);
    return true;
  }

  function retry(clientId: string) {
    const item = messages.value.find(item => item.senderId === userId.value && item.clientId === clientId);
    if (item?.status === "failed") sendItem(item);
  }

  onMounted(connect);
  onBeforeUnmount(() => {
    disposed = true;
    toast.dismiss(errorToastId);
    clearTimeout(reconnectTimer);
    clearConnectionTimers();
    for (const clientId of acknowledgements.keys()) fail(clientId, "Send interrupted. Please try again.");
    socket?.close(1000, "Conversation closed.");
  });

  return { messages, userId, connection, send, retry };
}
