<script setup lang="ts">
import { Paperclip, SendHorizontal } from "lucide-vue-next";
import { MAX_CHAT_MESSAGE_LENGTH } from "~~/shared/types/chat";

const props = defineProps<{ disabled?: boolean; attachmentsDisabled?: boolean }>();
const draft = defineModel<string>({ default: "" });
const emit = defineEmits<{ send: [body: string]; attach: [file: File] }>();

const fileInput = ref<HTMLInputElement>();

function attach(event: Event) {
  const input = event.target as HTMLInputElement;
  // The socket may reconnect while the native picker is open.
  for (const file of Array.from(input.files ?? [])) {
    emit("attach", file);
  }

  input.value = "";
}

const canSend = computed(() => !props.disabled && Boolean(draft.value.trim())
  && draft.value.trim().length <= MAX_CHAT_MESSAGE_LENGTH);

function submit() {
  if (canSend.value) {
    emit("send", draft.value);
  }
}

function onEnter(event: KeyboardEvent) {
  if (event.shiftKey || event.isComposing) return;
  event.preventDefault();

  if (!event.repeat) {
    submit();
  }
}
</script>

<template>
  <div
    data-slot="composer"
    class="shrink-0 px-3 pb-2"
  >
    <form
      class="rounded-lg border border-input bg-background p-3 shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
      aria-label="Message composer"
      @submit.prevent="submit"
    >
      <UiTextarea
        v-model="draft"
        class="field-sizing-fixed min-h-0 resize-none rounded-none border-0 p-0 text-sm text-foreground shadow-none focus-visible:ring-0"
        :disabled="disabled"
        :maxlength="MAX_CHAT_MESSAGE_LENGTH"
        placeholder="Compose your message…"
        aria-label="Message"
        rows="2"
        @keydown.enter="onEnter"
      />
      <div class="mt-1 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <input
            ref="fileInput"
            class="hidden"
            type="file"
            multiple
            aria-label="Choose a file"
            :disabled="attachmentsDisabled"
            @change="attach"
          >
          <UiButton
            variant="ghost"
            size="icon-sm"
            class="size-6 text-muted-foreground"
            :disabled="attachmentsDisabled"
            type="button"
            aria-label="Attach a file"
            title="Attach files"
            @click="fileInput?.click()"
          >
            <Paperclip :size="19" />
          </UiButton>
        </div>
        <UiButton
          variant="ghost"
          size="icon-sm"
          class="size-6 text-primary"
          :disabled="!canSend"
          type="submit"
          aria-label="Send message"
          title="Send message"
        >
          <SendHorizontal :size="21" />
        </UiButton>
      </div>
    </form>
    <p class="mt-2 hidden text-center text-xs text-muted-foreground sm:block">
      Enter to send · Shift + Enter for a new line
    </p>
  </div>
</template>
