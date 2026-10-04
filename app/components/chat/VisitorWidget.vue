<script setup lang="ts">
import { Check, LoaderCircle, MessageSquare, RotateCcw, X } from "lucide-vue-next";
import type { ChatRoom } from "~~/shared/types/chat";
import { authClient } from "@/lib/auth-client";
import { chatError } from "@/lib/chat-error";
import ChatComposer from "@/components/chat/ChatComposer.vue";

const props = defineProps<{ token?: string }>();
const open = ref(Boolean(props.token));
const joining = ref(false);
const error = ref("");
const room = ref<ChatRoom | null>(null);
let attempt = 0;

async function joinInvite() {
  const token = props.token;
  if (!token || joining.value) return;
  const currentAttempt = ++attempt;
  joining.value = true;
  error.value = "";
  room.value = null;
  try {
    // Validate the link before creating a guest account.
    const preview = await $fetch<{ room: ChatRoom; joined: boolean }>(`/api/invites/${encodeURIComponent(token)}`);
    const session = await authClient.getSession();
    if (session.error) throw new Error("Unable to check your session.");
    if (session.data && !session.data.user.isAnonymous) {
      error.value = "You're signed in as an operator. Open this invite in a private window to join as a visitor.";
      return;
    }
    if (!session.data) {
      const guest = await authClient.signIn.anonymous();
      if (guest.error) throw new Error("Unable to create your visitor session.");
    }
    const joinedRoom = preview.joined
      ? preview.room
      : await $fetch<ChatRoom>(`/api/invites/${encodeURIComponent(token)}/join`, { method: "POST" });
    if (currentAttempt === attempt) room.value = joinedRoom;
  }
  catch (cause) {
    if (currentAttempt === attempt) {
      error.value = chatError(cause, "We couldn't join this conversation. Please try again.");
    }
  }
  finally {
    joining.value = false;
    if (props.token && props.token !== token) void joinInvite();
  }
}

onMounted(() => {
  void joinInvite();
});
watch(() => props.token, () => {
  attempt++;
  room.value = null;
  error.value = "";
  if (props.token) {
    open.value = true;
    void joinInvite();
  }
});
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
            <h2>{{ room ? `Chat with ${room.operatorName}` : "Questions? Chat with us." }}</h2>
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
        <div
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
            /><h3>Joining your conversation</h3><p>Getting everything ready for you…</p>
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
              @click="joinInvite"
            >
              <RotateCcw :size="16" /> Try again
            </button>
          </div>
          <template v-else-if="room">
            <div class="widget-joined-label">
              <Check :size="13" /> You've joined the conversation
            </div>
            <div class="widget-greeting">
              Hi there 👋<br>Welcome! You're in the right place.
            </div>
            <p class="widget-greeting-caption">
              {{ room.operatorName }} · Your support operator
            </p>
            <div class="widget-room-card">
              <span class="chat-eyebrow">YOUR CONVERSATION</span><h3>{{ room.title }}</h3><p>Your room is ready. You'll be able to exchange messages here soon.</p>
            </div>
          </template>
          <template v-else>
            <div class="widget-greeting">
              Hello there 👋<br>How can we help you today?
            </div><p class="widget-greeting-caption">
              The Crisp team
            </p>
            <div class="widget-empty-state widget-welcome">
              <div class="widget-state-icon">
                <MessageSquare :size="27" />
              </div><h3>Good conversations start here.</h3><p>Have an invitation? Open the link your support operator shared to join your private conversation.</p>
            </div>
          </template>
        </div>
        <ChatComposer />
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
