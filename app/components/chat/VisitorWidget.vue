<script setup lang="ts">
import { LoaderCircle, MessageSquare, RotateCcw, X } from "lucide-vue-next";
import type { ChatRoom } from "~~/shared/types/chat";
import { authClient } from "@/lib/auth-client";
import { chatError } from "@/lib/chat-error";
import ChatConversation from "@/components/chat/ChatConversation.vue";

const open = ref(false);
const joining = ref(false);
const error = ref("");
const room = ref<ChatRoom | null>(null);

async function openConversation() {
  if (joining.value) return;
  joining.value = true;
  error.value = "";
  try {
    const session = await authClient.getSession();
    if (session.error) throw new Error("Unable to check your session.");
    if (session.data && !session.data.user.isAnonymous) {
      room.value = null;
      error.value = "You're signed in as an operator. Open this website in a private window to chat as a visitor.";
      return;
    }
    if (!session.data) {
      const guest = await authClient.signIn.anonymous();
      if (guest.error) throw new Error("Unable to create your visitor session.");
    }
    room.value = await $fetch<ChatRoom>("/api/rooms", { method: "POST" });
  }
  catch (cause) {
    error.value = chatError(cause, "We couldn't open your conversation. Please try again.");
  }
  finally {
    joining.value = false;
  }
}

watch(open, (isOpen) => {
  if (isOpen) void openConversation();
});

// Keep the operator's name current after they claim this room.
useIntervalFn(async () => {
  if (!open.value || !room.value || joining.value || error.value) return;
  try {
    room.value = await $fetch<ChatRoom>(`/api/rooms/${room.value.id}`);
  }
  catch {
    // The socket handles network recovery; a failed name refresh must not unmount it.
  }
}, 5000);
</script>

<template>
  <div class="visitor-chat">
    <Transition name="widget">
      <section
        v-if="open"
        id="visitor-conversation"
        class="visitor-widget"
        aria-label="Support conversation"
      >
        <header class="visitor-widget-header">
          <div class="visitor-team-avatar">
            <ChatCrispLogo compact />
          </div>
          <div class="visitor-heading">
            <h2>{{ room?.operatorName ? `Chat with ${room.operatorName}` : "Questions? Chat with us." }}</h2>
            <p>{{ room ? "Your personal conversation" : "A little help goes a long way" }}</p>
          </div>
          <button
            class="widget-close"
            type="button"
            aria-label="Close chat"
            @click="open = false"
          >
            <X :size="19" />
          </button>
        </header>
        <ChatConversation
          v-if="room && !joining && !error"
          :key="room.id"
          :room-id="room.id"
          :peer-name="room.operatorName ?? 'Support team'"
        />
        <div
          v-else
          class="visitor-widget-body"
          aria-live="polite"
        >
          <div
            v-if="joining"
            class="widget-empty-state"
          >
            <LoaderCircle
              class="chat-spinner"
              :size="30"
            /><h3>Opening your conversation</h3><p>Getting everything ready for you…</p>
          </div>
          <div
            v-else-if="error"
            class="widget-empty-state"
          >
            <div class="widget-state-icon">
              <MessageSquare :size="25" />
            </div><h3>We couldn't connect you</h3><p>{{ error }}</p>
            <button
              type="button"
              class="chat-button chat-button-secondary"
              @click="openConversation"
            >
              <RotateCcw :size="16" /> Try again
            </button>
          </div>
          <template v-else>
            <div class="widget-greeting">
              Hello there 👋<br>How can we help you today?
            </div><p class="widget-greeting-caption">
              The Crisp team
            </p>
            <div class="widget-empty-state widget-welcome">
              <div class="widget-state-icon">
                <MessageSquare :size="27" />
              </div><h3>Good conversations start here.</h3><p>Opening this chat starts your private conversation with our support team.</p>
            </div>
          </template>
        </div>
        <footer class="visitor-widget-footer">
          <ChatCrispLogo /> <span>We run on conversations.</span>
        </footer>
      </section>
    </Transition>
    <div
      v-if="!open"
      class="widget-launcher-hint"
    >
      We're here to help <span>👋</span>
    </div>
    <button
      class="widget-launcher"
      type="button"
      :aria-label="open ? 'Close chat' : 'Open support chat'"
      :aria-expanded="open"
      aria-controls="visitor-conversation"
      @click="open = !open"
    >
      <X
        v-if="open"
        :size="27"
      /><MessageSquare
        v-else
        :size="29"
        fill="currentColor"
      />
    </button>
  </div>
</template>
