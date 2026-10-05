<script setup lang="ts">
import { MessageSquare } from "lucide-vue-next";
import ChatComposer from "@/components/chat/ChatComposer.vue";
import { timeLabel } from "@/lib/date";

const props = defineProps<{ roomId: string; peerName: string }>();
const { messages, userId, connection, send, retry } = useChatMessages(props.roomId);

const draft = useState<string>(`chat-draft:${props.roomId}`, () => "");
const messageList = ref<HTMLElement>();

const sortedMessages = computed(() => {
  return [...messages.value].sort((a, b) =>
    a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
});

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

watch(messages, async () => {
  const list = messageList.value;
  const nearBottom = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  await nextTick();
  if (nearBottom && messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight;
}, { deep: true });

async function sendMessage(body: string) {
  if (!send(body)) return;
  draft.value = "";

  await nextTick();
  if (messageList.value) {
    messageList.value.scrollTop = messageList.value.scrollHeight;
  }
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
        v-if="!sortedMessages.length"
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
        v-for="item in sortedMessages"
        :key="item.id"
        class="mb-4.5 flex flex-col"
        :class="item.senderId === userId ? 'items-end' : 'items-start'"
      >
        <span class="mx-1 mb-1 text-xs text-muted-foreground">{{ item.senderId === userId ? 'You' : peerName }}</span>
        <p
          class="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm/relaxed wrap-anywhere whitespace-pre-wrap"
          :class="[item.senderId === userId ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted text-foreground', { 'ring-2 ring-destructive/50': item.status === 'failed' }]"
        >
          {{ item.body }}
        </p>
        <div class="mx-1 mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <time :datetime="item.createdAt.toISOString()">{{ timeLabel(item.createdAt) }}</time>
          <span v-if="item.senderId === userId">{{ item.status === 'sending' ? 'Sending…' : item.status === 'sent' ? 'Sent' : 'Failed' }}</span>
          <button
            v-if="item.status === 'failed'"
            class="font-medium text-primary underline outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-muted-foreground"
            type="button"
            :disabled="connection !== 'connected'"
            @click="retry(item.id)"
          >
            Retry
          </button>
        </div>
        <p
          v-if="item.error"
          class="mt-1 max-w-[85%] text-xs text-destructive"
        >
          {{ item.error }}
        </p>
      </article>
    </div>
    <ChatComposer
      v-model="draft"
      :disabled="connection !== 'connected'"
      @send="sendMessage"
    />
  </section>
</template>
