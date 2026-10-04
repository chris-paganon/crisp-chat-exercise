<script setup lang="ts">
import { ArrowLeft, Check, Copy, ExternalLink, Inbox, Link2, LoaderCircle, LogOut, MessageSquare, Plus, RefreshCw, Search, ShieldCheck, Users } from "lucide-vue-next";
import { authClient } from "@/lib/auth-client";
import { chatError } from "@/lib/chat-error";
import type { ChatInvite, ChatRoom } from "~~/shared/types/chat";

definePageMeta({ layout: false, middleware: "operator" });
useSeoMeta({ title: "Inbox | Crisp" });
const { data: session } = await authClient.useSession(useFetch);
const { data: rooms, error: loadError, status, refresh } = await useFetch<ChatRoom[]>("/api/rooms", { default: () => [] });
const selectedId = useRouteQuery<string>("room", "");
const selected = computed(() => rooms.value.find(room => room.id === selectedId.value));
const search = ref("");
const filteredRooms = computed(() => rooms.value.filter(room => room.title.toLowerCase().includes(search.value.toLowerCase())));
const showCreate = ref(false);
const title = ref("");
const busy = ref(false);
const error = ref("");
const inviteLinks = ref<Record<string, ChatInvite>>({});
const currentInvite = computed(() => selected.value ? inviteLinks.value[selected.value.id] : undefined);
const origin = useRequestURL().origin;
const inviteUrl = computed(() => currentInvite.value ? new URL(currentInvite.value.path, origin).href : "");
const copied = ref(false);
const mobileConversation = ref(Boolean(selectedId.value));
const visitorCount = computed(() => rooms.value.filter(room => room.visitorJoined).length);

watch(rooms, () => {
  if (!selected.value && rooms.value.length) selectedId.value = rooms.value[0]!.id;
}, { immediate: true });
watch(selectedId, () => {
  error.value = "";
  copied.value = false;
});

// Only room membership is refreshed; there is no message transport in this phase.
const { pause, resume } = useIntervalFn(() => {
  void refresh();
}, 5000, { immediate: false });
onMounted(resume);
onBeforeUnmount(pause);

function selectRoom(id: string) {
  selectedId.value = id;
  mobileConversation.value = true;
}
function openCreate() {
  title.value = "";
  error.value = "";
  showCreate.value = true;
}
async function createRoom() {
  if (busy.value || !title.value.trim()) return;
  busy.value = true;
  error.value = "";
  try {
    const result = await $fetch("/api/rooms", { method: "POST", body: { title: title.value.trim() } });
    inviteLinks.value[result.room.id] = result.invite;
    rooms.value = [result.room, ...rooms.value];
    selectRoom(result.room.id);
    showCreate.value = false;
  }
  catch (cause) { error.value = chatError(cause, "Couldn't create the conversation. Please try again."); }
  finally { busy.value = false; }
}
async function replaceInvite() {
  const id = selected.value?.id;
  if (!id || busy.value) return;
  busy.value = true;
  error.value = "";
  copied.value = false;
  try {
    inviteLinks.value[id] = await $fetch<ChatInvite>(`/api/rooms/${id}/invite`, { method: "POST" });
    await refresh();
  }
  catch (cause) { error.value = chatError(cause, "Couldn't create an invite. Please try again."); }
  finally { busy.value = false; }
}
async function copyInvite() {
  error.value = "";
  try {
    await navigator.clipboard.writeText(inviteUrl.value);
    copied.value = true;
  }
  catch { error.value = "Select and copy the invite link below."; }
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
        <Users :size="16" /> Visitors joined <span>{{ visitorCount }}</span>
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
        <div><h1>Inbox</h1><span>{{ rooms.length }} conversations</span></div><button
          type="button"
          class="new-room-button"
          aria-label="New conversation"
          @click="openCreate"
        >
          <Plus :size="21" />
        </button>
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
        <MessageSquare :size="30" /><h2>A fresh start</h2><p>Your conversations will appear here.</p><button
          class="chat-button chat-button-secondary"
          type="button"
          @click="openCreate"
        >
          <Plus :size="16" /> New conversation
        </button>
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
          @click="selectRoom(room.id)"
        >
          <span class="room-avatar">{{ room.visitorJoined ? 'V' : '?' }}<span
            v-if="room.visitorJoined"
            class="room-joined-dot"
          /></span><span class="room-entry-copy"><span><strong>{{ room.title }}</strong><small>{{ dateLabel(room.createdAt) }}</small></span><span>{{ room.visitorJoined ? 'Visitor joined · Ready to chat' : 'Waiting for your visitor' }}</span></span>
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
          </button><span class="room-avatar">{{ selected.visitorJoined ? 'V' : '?' }}</span><div><h2>{{ selected.title }}</h2><p><span :class="selected.visitorJoined ? 'status-joined' : 'status-waiting'" />{{ selected.visitorJoined ? 'Visitor joined' : 'Waiting for visitor' }}</p></div><span class="conversation-private"><ShieldCheck :size="15" /> Private room</span>
        </header>
        <div
          v-if="error && !showCreate"
          class="chat-error-banner"
          role="alert"
        >
          {{ error }}
        </div>
        <div class="conversation-content">
          <div class="conversation-date">
            {{ dateLabel(selected.createdAt) }} · Conversation created
          </div>
          <div class="conversation-setup">
            <div class="conversation-setup-icon">
              <Check
                v-if="selected.visitorJoined"
                :size="32"
              /><Link2
                v-else
                :size="32"
              />
            </div>
            <span class="chat-eyebrow">{{ selected.visitorJoined ? 'YOU’RE BOTH HERE' : 'A GOOD PLACE TO START' }}</span>
            <h2>{{ selected.visitorJoined ? 'Your visitor has joined.' : 'Say hello with a link.' }}</h2>
            <p>{{ selected.visitorJoined ? 'Your private conversation is ready. Messaging and file sharing will be available soon.' : 'Invite someone into this conversation. They can join instantly, without creating an account.' }}</p>
            <div
              v-if="!selected.visitorJoined"
              class="invite-card"
            >
              <div class="invite-card-heading">
                <Link2 :size="17" /><strong>Visitor invitation</strong><span>One guest</span>
              </div>
              <template v-if="currentInvite">
                <label
                  class="invite-input-label"
                  for="invite-link"
                >Share this private link</label><div class="invite-input-wrap">
                  <input
                    id="invite-link"
                    :value="inviteUrl"
                    readonly
                    aria-label="Visitor invite link"
                    @focus="($event.target as HTMLInputElement).select()"
                  ><button
                    class="chat-button"
                    type="button"
                    @click="copyInvite"
                  >
                    <Check
                      v-if="copied"
                      :size="16"
                    /><Copy
                      v-else
                      :size="16"
                    />{{ copied ? 'Copied' : 'Copy' }}
                  </button>
                </div><small>Expires {{ new Date(currentInvite.expiresAt).toLocaleString('en-GB') }}</small>
              </template>
              <p v-else>
                Create a fresh invite link to share with your visitor.
              </p>
              <button
                type="button"
                class="invite-replace-button"
                :disabled="busy"
                @click="replaceInvite"
              >
                <LoaderCircle
                  v-if="busy"
                  class="chat-spinner"
                  :size="14"
                /><RefreshCw
                  v-else
                  :size="14"
                />{{ currentInvite ? 'Replace invite link' : 'Create invite link' }}
              </button><p class="invite-card-note">
                {{ currentInvite ? 'Replacing the link makes the previous invitation invalid.' : 'A fresh link replaces any previous invitation.' }} Links expire after 24 hours.
              </p>
            </div>
            <div
              v-else
              class="conversation-joined-badge"
            >
              <Check :size="16" /> Operator + visitor · 2 of 2 participants
            </div>
          </div>
        </div>
        <ChatChatComposer />
      </template>
      <div
        v-else
        class="operator-empty-conversation"
      >
        <div class="conversation-setup-icon">
          <Inbox :size="35" />
        </div><span class="chat-eyebrow">WELCOME TO YOUR INBOX</span><h2>Every connection starts<br>with a conversation.</h2><p>Create a room, share an invite, and welcome your visitor.</p><button
          class="chat-button"
          type="button"
          @click="openCreate"
        >
          <Plus :size="17" /> New conversation
        </button><div
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
        <span class="profile-avatar"><Users :size="28" /></span><h3>{{ selected.visitorJoined ? 'Your visitor' : 'Visitor not here yet' }}</h3><p>{{ selected.visitorJoined ? 'Joined as a guest' : 'Invite them to get started' }}</p><span class="profile-status">{{ selected.visitorJoined ? 'Joined' : 'Awaiting invitation' }}</span>
      </div><div class="details-section">
        <span class="sidebar-section-label">PARTICIPANTS</span><div><span class="participant-avatar">{{ selected.operatorName.charAt(0).toUpperCase() }}</span><span><strong>{{ selected.operatorName }}</strong><small>Operator</small></span><Check :size="14" /></div><div><span class="participant-avatar participant-guest"><Users :size="16" /></span><span><strong>{{ selected.visitorJoined ? 'Visitor' : 'Available guest slot' }}</strong><small>{{ selected.visitorJoined ? 'Anonymous guest' : 'Not joined yet' }}</small></span></div>
      </div><div class="details-section">
        <span class="sidebar-section-label">ROOM INFORMATION</span><dl><dt>Created</dt><dd>{{ dateLabel(selected.createdAt) }}</dd><dt>Capacity</dt><dd>2 people</dd><dt>Privacy</dt><dd>Invite only</dd></dl>
      </div><div class="details-note">
        <ShieldCheck :size="18" /><p>Only you and your invited visitor can access this conversation.</p>
      </div>
    </aside>

    <UiDialog v-model:open="showCreate">
      <UiDialogContent class="sm:max-w-md">
        <UiDialogHeader><UiDialogTitle>Start a conversation</UiDialogTitle><UiDialogDescription>Give your room a name. We'll create a private invite link for your visitor.</UiDialogDescription></UiDialogHeader><form
          class="create-room-form"
          @submit.prevent="createRoom"
        >
          <label for="room-title">Conversation name</label><input
            id="room-title"
            v-model="title"
            required
            maxlength="100"
            autofocus
            placeholder="e.g. Help with getting started"
          ><p
            v-if="error"
            role="alert"
            class="create-room-error"
          >
            {{ error }}
          </p><div>
            <button
              class="chat-button chat-button-secondary"
              type="button"
              :disabled="busy"
              @click="showCreate = false"
            >
              Cancel
            </button><button
              class="chat-button"
              type="submit"
              :disabled="busy || !title.trim()"
            >
              <LoaderCircle
                v-if="busy"
                class="chat-spinner"
                :size="16"
              /><Plus
                v-else
                :size="16"
              />{{ busy ? 'Creating…' : 'Create conversation' }}
            </button>
          </div>
        </form>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
