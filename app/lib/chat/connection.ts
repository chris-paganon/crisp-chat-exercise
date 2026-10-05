import { toast } from "vue-sonner";
import { ref } from "vue";
import { ConnectionUnavailableError } from "@/lib/chat-error";
import type { ChatClientEvent, ChatServerEvent } from "~~/shared/types/chat";

export type ChatConnection = ReturnType<typeof createChatConnection>;

/** One room socket, shared by text messages and file-transfer signaling. */
export function createChatConnection(roomId: string) {
  const userId = ref("");
  const sessionEnded = ref(false);
  const connection = ref<"connecting" | "connected" | "reconnecting" | "closed">("connecting");
  const errorToastId = `chat-error:${roomId}`;
  const listeners = new Set<(event: ChatServerEvent) => void>();
  let socket: WebSocket | undefined;
  let disposed = false;
  let stopped = false;
  let attempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let connectionTimer: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let pongTimer: ReturnType<typeof setTimeout> | undefined;

  function close() {
    const current = socket;
    socket = undefined;
    if (!stopped) {
      toast.dismiss(errorToastId);
    }
    clearTimeout(reconnectTimer);
    clearConnectionTimers();
    current?.close(1000, "Conversation closed.");
    attempts = 0;
    connection.value = "closed";
  }

  function dispose() {
    disposed = true;
    close();
    listeners.clear();
  }

  function connect() {
    if (disposed || stopped || socket) {
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

      if (event.type === "ready") {
        userId.value = event.userId;
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
      }
      if (event.type === "pong") clearTimeout(pongTimer);
      if (event.type === "error") {
        if (!event.id || event.fatal) toast.error(event.message, { id: errorToastId });
        if (event.fatal) {
          stopped = true;
          sessionEnded.value = true;
          current.close();
        }
      }

      for (const listener of listeners) {
        listener(event);
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

    if (!stopped && event.code === 1008) {
      toast.error("Your session ended. Reload to sign in again.", {
        id: errorToastId,
        duration: Infinity,
      });
      stopped = true;
      sessionEnded.value = true;
    }

    if (stopped) {
      connection.value = "closed";
      return;
    }

    const delay = Math.min(1000 * 2 ** attempts++, 15000);
    reconnectTimer = setTimeout(connect, delay);
    // A hidden room may close itself synchronously when its transfer fails.
    connection.value = "reconnecting";
  }

  function clearConnectionTimers() {
    clearTimeout(connectionTimer);
    clearInterval(heartbeat);
    clearTimeout(pongTimer);
  }

  function transmit(event: ChatClientEvent) {
    if (socket?.readyState !== WebSocket.OPEN) {
      throw new ConnectionUnavailableError();
    }

    socket.send(JSON.stringify(event));
  }

  function onEvent(listener: (event: ChatServerEvent) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { userId, sessionEnded, connection, transmit, onEvent, connect, close, dispose };
}
