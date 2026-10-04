<script setup lang="ts">
import { Paperclip, SendHorizontal, Smile } from "lucide-vue-next";
</script>

<template>
  <div class="chat-composer-wrap">
    <div
      class="chat-composer"
      aria-label="Message composer (coming soon)"
    >
      <textarea
        disabled
        placeholder="Compose your message…"
        aria-label="Message (coming soon)"
        rows="2"
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
          disabled
          type="button"
          aria-label="Send message (coming soon)"
          title="Coming soon"
        >
          <SendHorizontal :size="21" />
        </button>
      </div>
    </div>
    <p class="chat-composer-note">
      Messaging &amp; file sharing are coming soon
    </p>
  </div>
</template>
