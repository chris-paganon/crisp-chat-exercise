<script setup lang="ts">
import { MessageSquare } from "lucide-vue-next";
import ChatComposer from "@/components/chat/ChatComposer.vue";

const props = defineProps<{ roomId: string; peerName: string }>();
const { messages, userId, connection, error, send, retry } = useChatMessages(props.roomId);
const draft = useState<string>(`chat-draft:${props.roomId}`, () => "");
const messageList = ref<HTMLElement>();
const sortedMessages = computed(() => [...messages.value].sort((a, b) =>
  a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
const statusLabel = computed(() => ({
  connecting: "Connecting…",
  connected: "Connected · Messages are saved",
  reconnecting: "Connection lost · Reconnecting…",
  closed: "Disconnected",
})[connection.value]);

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
  if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight;
}

function timeLabel(value: string) {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
</script>

<template>
  <section
    class="chat-thread"
    aria-label="Chat messages"
  >
    <p
      class="chat-connection"
      :class="{ 'chat-connection-ready': connection === 'connected' }"
      role="status"
    >
      {{ statusLabel }}
    </p>
    <p
      v-if="error"
      class="chat-error-banner"
      role="alert"
    >
      {{ error }}
    </p>
    <div
      ref="messageList"
      class="chat-message-list"
      role="log"
      aria-label="Conversation history"
      aria-live="polite"
    >
      <div
        v-if="!sortedMessages.length"
        class="widget-empty-state"
      >
        <div class="widget-state-icon">
          <MessageSquare :size="25" />
        </div>
        <h3>Start the conversation</h3>
        <p>Send a message below. You can come back to this conversation later.</p>
      </div>
      <article
        v-for="item in sortedMessages"
        :key="`${item.senderId}:${item.clientId}`"
        class="chat-message"
        :class="{ 'chat-message-own': item.senderId === userId, 'chat-message-failed': item.status === 'failed' }"
      >
        <span class="chat-message-author">{{ item.senderId === userId ? 'You' : peerName }}</span>
        <p class="chat-message-bubble">
          {{ item.body }}
        </p>
        <div class="chat-message-meta">
          <time :datetime="item.createdAt">{{ timeLabel(item.createdAt) }}</time>
          <span v-if="item.senderId === userId">{{ item.status === 'sending' ? 'Sending…' : item.status === 'sent' ? 'Sent' : 'Failed' }}</span>
          <button
            v-if="item.status === 'failed'"
            type="button"
            :disabled="connection !== 'connected'"
            @click="retry(item.clientId)"
          >
            Retry
          </button>
        </div>
        <p
          v-if="item.error"
          class="chat-message-error"
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
