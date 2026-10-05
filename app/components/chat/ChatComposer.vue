<script setup lang="ts">
import { Paperclip, SendHorizontal, Smile } from "lucide-vue-next";
import { MAX_CHAT_MESSAGE_LENGTH } from "~~/shared/types/chat";

const props = defineProps<{ disabled?: boolean }>();
const draft = defineModel<string>({ default: "" });
const emit = defineEmits<{ send: [body: string] }>();
const canSend = computed(() => !props.disabled && Boolean(draft.value.trim())
  && draft.value.trim().length <= MAX_CHAT_MESSAGE_LENGTH);

function submit() {
  if (canSend.value) emit("send", draft.value);
}

function onEnter(event: KeyboardEvent) {
  if (event.shiftKey || event.isComposing) return;
  event.preventDefault();
  if (!event.repeat) submit();
}
</script>

<template>
  <div class="chat-composer-wrap">
    <form
      class="chat-composer"
      aria-label="Message composer"
      @submit.prevent="submit"
    >
      <textarea
        v-model="draft"
        :disabled="disabled"
        :maxlength="MAX_CHAT_MESSAGE_LENGTH"
        placeholder="Compose your message…"
        aria-label="Message"
        rows="2"
        @keydown.enter="onEnter"
      />
      <div class="chat-composer-tools">
        <div>
          <button
            disabled
            type="button"
            aria-label="Emoji (coming soon)"
            title="Coming soon"
          >
            <Smile :size="19" />
          </button>
          <button
            disabled
            type="button"
            aria-label="Attach a file (coming soon)"
            title="Coming soon"
          >
            <Paperclip :size="19" />
          </button>
        </div>
        <button
          :disabled="!canSend"
          type="submit"
          aria-label="Send message"
          title="Send message"
        >
          <SendHorizontal :size="21" />
        </button>
      </div>
    </form>
    <p class="chat-composer-note">
      Enter to send · Shift + Enter for a new line
    </p>
  </div>
</template>
