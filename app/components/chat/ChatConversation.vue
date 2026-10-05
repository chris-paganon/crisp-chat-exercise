<script setup lang="ts">
import { MessageSquare } from "lucide-vue-next";
import ChatFileTransfer from "@/components/chat/ChatFileTransfer.vue";
import ChatComposer from "@/components/chat/ChatComposer.vue";
import { timeLabel } from "@/lib/date";

const props = defineProps<{ roomId: string; peerName: string }>();
const { chat, messages: roomMessages, files } = useRoomSession(props.roomId);
const { userId, connection } = chat;
const { messages, send, retry } = roomMessages;
const { transfers } = files;

const draft = useState<string>(`chat-draft:${props.roomId}`, () => "");
const messageList = ref<HTMLElement>();
let initialHistoryLoaded = connection.value === "connected";

function scrollToBottom() {
  const list = messageList.value;
  if (list) {
    list.scrollTop = list.scrollHeight;
  }
}

onMounted(scrollToBottom);

const unsubscribeHistory = chat.onEvent((event) => {
  if (event.type !== "ready" || initialHistoryLoaded) return;

  initialHistoryLoaded = true;
  void nextTick(scrollToBottom);
});
onBeforeUnmount(unsubscribeHistory);

const sortedItems = computed(() => [
  ...messages.value.map(item => ({
    kind: "message" as const, item, createdAt: item.createdAt.getTime(), outgoing: item.senderId === userId.value,
  })),
  ...transfers.value.map(item => ({
    kind: "file" as const, item, createdAt: item.createdAt, outgoing: item.direction === "outgoing",
  })),
].sort((a, b) => a.createdAt - b.createdAt || a.item.id.localeCompare(b.item.id)));

const statusLabel = computed(() => {
  switch (connection.value) {
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Connected · Messages are saved";
    case "reconnecting":
      return "Connection lost · Reconnecting…";
    case "closed":
      return "Disconnected";
    default:
      return "Unknown connection status";
  }
});

watch([messages, transfers], async () => {
  const list = messageList.value;
  const nearBottom = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  await nextTick();
  if (nearBottom) {
    scrollToBottom();
  }
}, { deep: true });

async function sendMessage(body: string) {
  if (!send(body)) return;
  draft.value = "";

  await nextTick();
  scrollToBottom();
}
</script>

<template>
  <section
    class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    aria-label="Chat messages"
  >
    <p
      class="shrink-0 px-4 py-2.5 text-center text-xs"
      :class="connection === 'connected' ? 'bg-chart-2/10 text-chart-2' : 'bg-accent text-muted-foreground'"
      role="status"
    >
      {{ statusLabel }}
    </p>
    <div
      ref="messageList"
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4.5 py-5"
      role="log"
      aria-label="Conversation history"
      aria-live="polite"
    >
      <div
        v-if="!sortedItems.length"
        class="flex min-h-55 flex-col items-center justify-center px-3 py-5 text-center"
      >
        <div class="mb-4 grid size-14 place-items-center rounded-lg border bg-accent text-primary">
          <MessageSquare :size="25" />
        </div>
        <h3 class="my-2.5 text-sm font-medium">
          Start the conversation
        </h3>
        <p class="max-w-68 text-xs/relaxed text-muted-foreground">
          Send a message below. You can come back to this conversation later.
        </p>
      </div>
      <article
        v-for="entry in sortedItems"
        :key="entry.item.id"
        class="mb-4.5 flex flex-col"
        :class="entry.outgoing ? 'items-end' : 'items-start'"
      >
        <span class="mx-1 mb-1 text-xs text-muted-foreground">{{ entry.outgoing ? 'You' : peerName }}</span>
        <template v-if="entry.kind === 'message'">
          <p
            class="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm/relaxed wrap-anywhere whitespace-pre-wrap"
            :class="[entry.outgoing ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted text-foreground', { 'ring-2 ring-destructive/50': entry.item.status === 'failed' }]"
          >
            {{ entry.item.body }}
          </p>
          <div class="mx-1 mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <time :datetime="entry.item.createdAt.toISOString()">{{ timeLabel(entry.item.createdAt) }}</time>
            <span v-if="entry.outgoing">{{ entry.item.status === 'sending' ? 'Sending…' : entry.item.status === 'sent' ? 'Sent' : 'Failed' }}</span>
            <button
              v-if="entry.item.status === 'failed'"
              class="font-medium text-primary underline outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-muted-foreground"
              type="button"
              :disabled="connection !== 'connected'"
              @click="retry(entry.item.id)"
            >
              Retry
            </button>
          </div>
          <p
            v-if="entry.item.error"
            class="mt-1 max-w-[85%] text-xs text-destructive"
          >
            {{ entry.item.error }}
          </p>
        </template>
        <ChatFileTransfer
          v-else
          :transfer="entry.item"
          @accept="files.accept(entry.item.id)"
          @resume="files.resume(entry.item.id, $event)"
          @decline="files.stop(entry.item.id, 'file-decline')"
          @cancel="files.stop(entry.item.id, 'file-cancel')"
          @download="files.download(entry.item.id)"
          @remove="files.remove(entry.item.id)"
        />
      </article>
    </div>
    <ChatComposer
      v-model="draft"
      :disabled="connection !== 'connected'"
      @send="sendMessage"
      @attach="files.offer"
    />
  </section>
</template>
