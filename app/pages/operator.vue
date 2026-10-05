<script setup lang="ts">
import { ArrowLeft, Check, ExternalLink, Inbox, LogOut, MessageSquare, ShieldCheck, Users } from "lucide-vue-next";
import { authClient } from "@/lib/auth-client";
import ChatConversation from "@/components/chat/ChatConversation.vue";

definePageMeta({ layout: false, middleware: "operator" });
useSeoMeta({ title: "Inbox | Crisp" });
const { data: session } = await authClient.useSession(useFetch);
const { data: rooms } = await useOperatorRooms();
const selectedId = useRouteQuery<string>("room", "");
const selected = computed(() => rooms.value.find(room => room.id === selectedId.value && room.operatorName));
const mobileConversation = ref(Boolean(selectedId.value));
const unclaimedCount = computed(() => rooms.value.filter(room => !room.operatorName).length);
const error = ref("");

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
    class="grid h-dvh grid-cols-[3.5rem_minmax(0,1fr)] overflow-hidden bg-background text-sm text-foreground sm:grid-cols-[4.5rem_16rem_minmax(0,1fr)] lg:grid-cols-[14rem_18.75rem_minmax(0,1fr)]"
    :class="[mobileConversation ? 'max-sm:grid-cols-1' : '', selected ? 'xl:grid-cols-[14rem_18.75rem_minmax(0,1fr)_16.25rem]' : '']"
  >
    <aside
      class="min-h-0 flex-col items-center border-r bg-sidebar px-1.5 pt-6 sm:px-2.5 lg:items-stretch lg:px-4"
      :class="mobileConversation ? 'hidden sm:flex' : 'flex'"
    >
      <NuxtLink
        to="/"
        aria-label="Crisp home"
        class="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring lg:ml-2"
      >
        <ChatCrispLogo class="[&>span]:hidden lg:[&>span]:inline" />
      </NuxtLink>
      <div class="mx-2 mt-8 mb-6 hidden items-center gap-2.5 lg:flex">
        <span class="grid size-9 shrink-0 place-items-center rounded-md border bg-accent text-primary"><MessageSquare class="size-5" /></span>
        <div><strong class="text-xs font-medium">My workspace</strong><small class="mt-1 block text-xs text-muted-foreground">Personal support inbox</small></div>
      </div>
      <div class="mt-8 flex items-center justify-center gap-2.5 rounded-sm bg-sidebar-primary px-2 py-3 text-sidebar-primary-foreground shadow-xs lg:mt-0 lg:justify-start lg:px-3">
        <Inbox class="size-4.5 shrink-0" /><span class="hidden lg:inline">Inbox</span><span class="ml-auto hidden text-xs lg:inline">{{ rooms.length }}</span>
      </div>
      <span class="mx-3 mt-7 mb-3 hidden text-xs font-medium tracking-wider text-muted-foreground lg:block">YOUR INBOX</span>
      <div class="hidden items-center gap-2 rounded-sm bg-sidebar-accent px-3 py-2.5 text-xs text-sidebar-accent-foreground lg:flex">
        <MessageSquare class="size-4" /> All conversations <span class="ml-auto text-muted-foreground">{{ rooms.length }}</span>
      </div>
      <div class="hidden items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground lg:flex">
        <Users class="size-4" /> Unclaimed <span class="ml-auto">{{ unclaimedCount }}</span>
      </div>
      <div class="mt-auto w-full">
        <NuxtLink
          to="/"
          class="mx-2 my-4 hidden items-center gap-2 rounded-sm text-xs text-muted-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring lg:flex"
        >
          <ExternalLink class="size-4" /> View visitor website
        </NuxtLink>
        <div class="flex min-w-0 flex-col items-center gap-2.5 border-t py-4 lg:flex-row">
          <span class="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs text-primary">{{ session?.user.name.charAt(0).toUpperCase() }}</span>
          <div class="hidden min-w-0 lg:block">
            <strong class="block truncate text-xs font-medium">{{ session?.user.name }}</strong><small class="mt-0.5 block text-xs text-muted-foreground">Operator</small>
          </div>
          <UiButton
            type="button"
            variant="ghost"
            size="icon-sm"
            class="size-7 text-muted-foreground lg:ml-auto"
            aria-label="Sign out"
            @click="signOut"
          >
            <LogOut class="size-4" />
          </UiButton>
        </div>
      </div>
    </aside>

    <OperatorInbox
      :class="mobileConversation ? 'hidden sm:flex' : 'flex'"
      @open="mobileConversation = true"
    />

    <main
      class="min-h-0 min-w-0 flex-col overflow-hidden bg-card"
      :class="mobileConversation ? 'flex' : 'hidden sm:flex'"
    >
      <template v-if="selected">
        <header class="flex min-h-19 shrink-0 items-center gap-3 border-b bg-background p-4 lg:px-6">
          <UiButton
            type="button"
            variant="ghost"
            size="icon-sm"
            class="text-muted-foreground sm:hidden"
            aria-label="Back to conversations"
            @click="mobileConversation = false"
          >
            <ArrowLeft class="size-5" />
          </UiButton>
          <span class="grid size-9 shrink-0 place-items-center rounded-full border bg-muted text-muted-foreground">V</span>
          <div class="min-w-0">
            <h2 class="truncate text-sm font-medium">
              {{ selected.title }}
            </h2><p class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span class="size-1.5 rounded-full bg-chart-2" />Claimed by you
            </p>
          </div>
          <span class="ml-auto hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground lg:flex"><ShieldCheck class="size-4" /> Private room</span>
        </header>
        <div
          v-if="error"
          class="mx-4 mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {{ error }}
        </div>
        <ChatConversation
          :key="selected.id"
          :room-id="selected.id"
          peer-name="Visitor"
          class="[&>[data-slot=composer]]:px-4 [&>[data-slot=composer]]:pb-4 lg:[&>[data-slot=composer]]:px-6"
        />
      </template>
      <div
        v-else
        class="flex flex-1 flex-col items-center justify-center p-6 text-center"
      >
        <UiButton
          v-if="mobileConversation"
          type="button"
          variant="ghost"
          size="sm"
          class="mb-6 sm:hidden"
          @click="mobileConversation = false"
        >
          <ArrowLeft class="size-4" /> Back to conversations
        </UiButton>
        <div class="mb-6 grid size-18 place-items-center rounded-xl border bg-accent text-primary shadow-xs">
          <Inbox class="size-9" />
        </div>
        <span class="text-xs font-medium tracking-widest text-muted-foreground">WELCOME TO YOUR INBOX</span>
        <h2 class="mt-4 text-3xl font-medium tracking-tight">
          Help starts with<br>a conversation.
        </h2>
        <p class="mt-4 mb-6 text-xs/relaxed text-muted-foreground">
          Open an unclaimed conversation to join your visitor.
        </p>
        <div
          v-if="error"
          class="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {{ error }}
        </div>
      </div>
    </main>

    <aside
      v-if="selected"
      class="hidden min-h-0 overflow-y-auto border-l bg-background xl:block"
      aria-label="Conversation details"
    >
      <h2 class="border-b px-5 py-7 text-xs font-medium text-muted-foreground">
        Conversation details
      </h2>
      <div class="px-5 pt-7 pb-6 text-center">
        <span class="mx-auto grid size-16 place-items-center rounded-full border bg-muted text-muted-foreground"><Users class="size-7" /></span>
        <h3 class="mt-4 text-sm font-medium">
          Your visitor
        </h3><p class="mt-1.5 text-xs text-muted-foreground">
          Joined as a guest
        </p><UiBadge
          variant="outline"
          class="mt-3 text-muted-foreground"
        >
          Joined
        </UiBadge>
      </div>
      <div class="border-t p-5">
        <span class="text-xs font-medium tracking-wider text-muted-foreground">PARTICIPANTS</span>
        <div class="mt-4 flex items-center gap-2">
          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs text-primary">{{ selected.operatorName?.charAt(0).toUpperCase() }}</span>
          <span class="min-w-0"><strong class="block text-xs font-medium wrap-anywhere">{{ selected.operatorName }}</strong><small class="mt-1 block text-xs text-muted-foreground">Operator</small></span><Check class="ml-auto size-3.5 shrink-0 text-chart-2" />
        </div>
        <div class="mt-4 flex items-center gap-2">
          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Users class="size-4" /></span>
          <span><strong class="block text-xs font-medium">Visitor</strong><small class="mt-1 block text-xs text-muted-foreground">Anonymous guest</small></span>
        </div>
      </div>
      <div class="border-t p-5">
        <span class="text-xs font-medium tracking-wider text-muted-foreground">ROOM INFORMATION</span>
        <dl class="mt-5 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <dt>Created</dt><dd class="text-right">
            {{ dateLabel(selected.createdAt) }}
          </dd><dt>Capacity</dt><dd class="text-right">
            2 people
          </dd><dt>Privacy</dt><dd class="text-right">
            Visitor + operator
          </dd>
        </dl>
      </div>
      <div class="m-5 flex gap-2 rounded-md bg-accent p-3 text-muted-foreground">
        <ShieldCheck class="size-4.5 shrink-0" /><p class="text-xs/relaxed">
          Only you and your visitor can access this conversation.
        </p>
      </div>
    </aside>
  </div>
</template>
