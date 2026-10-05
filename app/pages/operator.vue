<script setup lang="ts">
import { ArrowLeft, Check, ExternalLink, Inbox, LoaderCircle, LogOut, MessageSquare, RefreshCw, Search, ShieldCheck, Users } from "lucide-vue-next";
import { authClient } from "@/lib/auth-client";
import { chatError } from "@/lib/chat-error";
import type { ChatRoom } from "~~/shared/types/chat";
import ChatConversation from "@/components/chat/ChatConversation.vue";

definePageMeta({ layout: false, middleware: "operator" });
useSeoMeta({ title: "Inbox | Crisp" });
const { data: session } = await authClient.useSession(useFetch);
const { data: rooms, error: loadError, status, refresh } = await useFetch<ChatRoom[]>("/api/rooms", { default: () => [] });
const selectedId = useRouteQuery<string>("room", "");
const selected = computed(() => rooms.value.find(room => room.id === selectedId.value && room.operatorName));
const search = ref("");
const filteredRooms = computed(() => rooms.value.filter(room => room.title.toLowerCase().includes(search.value.toLowerCase())));
const busy = ref(false);
const error = ref("");
const mobileConversation = ref(Boolean(selectedId.value));
const unclaimedCount = computed(() => rooms.value.filter(room => !room.operatorName).length);

watch(selectedId, () => {
  error.value = "";
});

// Refresh the inbox for newly opened or claimed visitor rooms.
const { pause, resume } = useIntervalFn(() => {
  void refresh();
}, 5000, { immediate: false });
onMounted(() => {
  resume();
  if (selectedId.value) void selectRoom(selectedId.value);
});
onBeforeUnmount(pause);

async function selectRoom(id: string) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    const current = rooms.value.find(room => room.id === id);
    if (!current?.operatorName) {
      const claimed = await $fetch<ChatRoom>(`/api/rooms/${id}/claim`, { method: "POST" });
      rooms.value = [claimed, ...rooms.value.filter(room => room.id !== id)];
    }
    selectedId.value = id;
    mobileConversation.value = true;
  }
  catch (cause) {
    await refresh();
    error.value = chatError(cause, "Couldn't open the conversation. Please try again.");
  }
  finally { busy.value = false; }
}
async function signOut() {
  const result = await authClient.signOut();
  if (result.error) {
    error.value = "Couldn't sign out. Please try again.";
    return;
  }
  await navigateTo("/");
}
function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
</script>

<template>
  <div
    class="operator-app"
    :class="{ 'operator-show-conversation': mobileConversation }"
  >
    <aside class="operator-sidebar">
      <NuxtLink
        to="/"
        aria-label="Crisp home"
      ><ChatCrispLogo /></NuxtLink>
      <div class="operator-workspace">
        <span class="workspace-icon"><MessageSquare :size="20" /></span><div><strong>My workspace</strong><small>Personal support inbox</small></div>
      </div>
      <div class="operator-navigation">
        <span><Inbox :size="18" /> Inbox <b>{{ rooms.length }}</b></span>
      </div>
      <span class="sidebar-section-label">YOUR INBOX</span>
      <div class="operator-sidebar-item">
        <MessageSquare :size="16" /> All conversations <span>{{ rooms.length }}</span>
      </div>
      <div class="operator-sidebar-stat">
        <Users :size="16" /> Unclaimed <span>{{ unclaimedCount }}</span>
      </div>
      <div class="operator-sidebar-bottom">
        <NuxtLink to="/"><ExternalLink :size="16" /> View visitor website</NuxtLink><div class="operator-user">
          <span>{{ session?.user.name.charAt(0).toUpperCase() }}</span><div><strong>{{ session?.user.name }}</strong><small>Operator</small></div><button
            type="button"
            aria-label="Sign out"
            @click="signOut"
          >
            <LogOut :size="17" />
          </button>
        </div>
      </div>
    </aside>

    <section
      class="operator-room-list"
      aria-label="Conversations"
    >
      <header>
        <div><h1>Inbox</h1><span>{{ unclaimedCount }} unclaimed · {{ rooms.length - unclaimedCount }} yours</span></div>
      </header>
      <label class="room-search"><Search :size="16" /><input
        v-model="search"
        type="search"
        placeholder="Search conversations"
        aria-label="Search conversations"
      ></label>
      <div class="room-list-heading">
        <span>All conversations</span><button
          type="button"
          aria-label="Refresh conversations"
          :disabled="status === 'pending'"
          @click="refresh()"
        >
          <RefreshCw :size="14" />
        </button>
      </div>
      <div
        v-if="loadError"
        class="room-list-empty"
        role="alert"
      >
        <p>Couldn't load your conversations.</p><button
          class="chat-button chat-button-secondary"
          type="button"
          @click="refresh()"
        >
          Try again
        </button>
      </div>
      <div
        v-else-if="status === 'pending' && !rooms.length"
        class="room-list-empty"
      >
        <LoaderCircle
          class="chat-spinner"
          :size="24"
        /><p>Loading conversations…</p>
      </div>
      <div
        v-else-if="!rooms.length"
        class="room-list-empty"
      >
        <MessageSquare :size="30" /><h2>Waiting for visitors</h2><p>New conversations appear here when visitors open the chat.</p>
      </div>
      <div
        v-else-if="!filteredRooms.length"
        class="room-list-empty"
      >
        <p>No conversations match your search.</p>
      </div>
      <div
        v-else
        class="room-list-scroll"
      >
        <button
          v-for="room in filteredRooms"
          :key="room.id"
          type="button"
          class="room-list-entry"
          :class="{ 'room-list-entry-selected': selectedId === room.id }"
          :aria-current="selectedId === room.id ? 'true' : undefined"
          :disabled="busy"
          @click="selectRoom(room.id)"
        >
          <span class="room-avatar">V<span
            v-if="room.operatorName"
            class="room-joined-dot"
          /></span><span class="room-entry-copy"><span><strong>{{ room.title }}</strong><small>{{ dateLabel(room.createdAt) }}</small></span><span>{{ room.operatorName ? 'Claimed by you' : 'Unclaimed · Open to join' }}</span></span>
        </button>
      </div>
      <footer class="room-list-footer">
        <ShieldCheck :size="14" /> Private conversations, just for two.
      </footer>
    </section>

    <main class="operator-conversation">
      <template v-if="selected">
        <header class="conversation-header">
          <button
            type="button"
            class="mobile-back"
            aria-label="Back to conversations"
            @click="mobileConversation = false"
          >
            <ArrowLeft :size="20" />
          </button><span class="room-avatar">V</span><div><h2>{{ selected.title }}</h2><p><span class="status-joined" />Claimed by you</p></div><span class="conversation-private"><ShieldCheck :size="15" /> Private room</span>
        </header>
        <div
          v-if="error"
          class="chat-error-banner"
          role="alert"
        >
          {{ error }}
        </div>
        <ChatConversation
          :key="selected.id"
          :room-id="selected.id"
          peer-name="Visitor"
        />
      </template>
      <div
        v-else
        class="operator-empty-conversation"
      >
        <div class="conversation-setup-icon">
          <Inbox :size="35" />
        </div><span class="chat-eyebrow">WELCOME TO YOUR INBOX</span><h2>Help starts with<br>a conversation.</h2><p>Open an unclaimed conversation to join your visitor.</p><div
          v-if="error"
          class="chat-error-banner"
          role="alert"
        >
          {{ error }}
        </div>
      </div>
    </main>

    <aside
      v-if="selected"
      class="operator-details"
    >
      <h2>Conversation details</h2><div class="visitor-profile">
        <span class="profile-avatar"><Users :size="28" /></span><h3>Your visitor</h3><p>Joined as a guest</p><span class="profile-status">Joined</span>
      </div><div class="details-section">
        <span class="sidebar-section-label">PARTICIPANTS</span><div><span class="participant-avatar">{{ selected.operatorName?.charAt(0).toUpperCase() }}</span><span><strong>{{ selected.operatorName }}</strong><small>Operator</small></span><Check :size="14" /></div><div><span class="participant-avatar participant-guest"><Users :size="16" /></span><span><strong>Visitor</strong><small>Anonymous guest</small></span></div>
      </div><div class="details-section">
        <span class="sidebar-section-label">ROOM INFORMATION</span><dl><dt>Created</dt><dd>{{ dateLabel(selected.createdAt) }}</dd><dt>Capacity</dt><dd>2 people</dd><dt>Privacy</dt><dd>Visitor + operator</dd></dl>
      </div><div class="details-note">
        <ShieldCheck :size="18" /><p>Only you and your visitor can access this conversation.</p>
      </div>
    </aside>
  </div>
</template>
