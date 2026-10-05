<script setup lang="ts">
import { ArrowLeft, Check, Inbox, ShieldCheck, Users } from "lucide-vue-next";
import ChatConversation from "@/components/chat/ChatConversation.vue";

definePageMeta({ layout: "operator", middleware: "operator" });
useSeoMeta({ title: "Inbox | Crisp" });
const { data: rooms } = await useOperatorRooms();
const selectedId = useRouteQuery<string>("room", "");
const selected = computed(() => rooms.value.find(room => room.id === selectedId.value && room.operatorName));
const mobileConversation = ref(Boolean(selectedId.value));

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
</script>

<template>
  <div
    class="grid min-h-0 min-w-0 grid-cols-1 overflow-hidden sm:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-[22rem_minmax(0,1fr)]"
    :data-mobile-conversation="mobileConversation"
    :class="selected ? 'xl:grid-cols-[22rem_minmax(0,1fr)_18rem]' : ''"
  >
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
            <h2 class="truncate text-base font-medium">
              {{ selected.title }}
            </h2><p class="mt-1 flex items-center gap-1.5 text-base text-muted-foreground">
              <span class="size-1.5 rounded-full bg-chart-2" />Claimed by you
            </p>
          </div>
          <span class="ml-auto hidden shrink-0 items-center gap-1.5 text-base text-muted-foreground lg:flex"><ShieldCheck class="size-4" /> Private room</span>
        </header>
        <ChatConversation
          :key="selected.id"
          :room-id="selected.id"
          peer-name="Visitor"
          class="[&_*]:text-base [&>[data-slot=composer]]:px-4 [&>[data-slot=composer]]:pb-4 lg:[&>[data-slot=composer]]:px-6"
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
          size="default"
          class="mb-6 sm:hidden"
          @click="mobileConversation = false"
        >
          <ArrowLeft class="size-4" /> Back to conversations
        </UiButton>
        <div class="mb-6 grid size-18 place-items-center rounded-xl border bg-accent text-primary shadow-xs">
          <Inbox class="size-9" />
        </div>
        <span class="text-base font-medium tracking-widest text-muted-foreground">WELCOME TO YOUR INBOX</span>
        <h2 class="mt-4 text-3xl font-medium tracking-tight">
          Help starts with<br>a conversation.
        </h2>
        <p class="mt-4 mb-6 text-base/relaxed text-muted-foreground">
          Open an unclaimed conversation to join your visitor.
        </p>
      </div>
    </main>

    <aside
      v-if="selected"
      class="hidden min-h-0 overflow-y-auto border-l bg-background xl:block"
      aria-label="Conversation details"
    >
      <h2 class="border-b px-5 py-7 text-base font-medium text-muted-foreground">
        Conversation details
      </h2>
      <div class="px-5 pt-7 pb-6 text-center">
        <span class="mx-auto grid size-16 place-items-center rounded-full border bg-muted text-muted-foreground"><Users class="size-7" /></span>
        <h3 class="mt-4 text-base font-medium">
          Your visitor
        </h3><p class="mt-1.5 text-base text-muted-foreground">
          Joined as a guest
        </p><UiBadge
          variant="outline"
          class="mt-3 text-base text-muted-foreground"
        >
          Joined
        </UiBadge>
      </div>
      <div class="border-t p-5">
        <span class="text-base font-medium tracking-wider text-muted-foreground">PARTICIPANTS</span>
        <div class="mt-4 flex items-center gap-2">
          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-base text-primary">{{ selected.operatorName?.charAt(0).toUpperCase() }}</span>
          <span class="min-w-0"><strong class="block text-base font-medium wrap-anywhere">{{ selected.operatorName }}</strong><small class="mt-1 block text-base text-muted-foreground">Operator</small></span><Check class="ml-auto size-3.5 shrink-0 text-chart-2" />
        </div>
        <div class="mt-4 flex items-center gap-2">
          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Users class="size-4" /></span>
          <span><strong class="block text-base font-medium">Visitor</strong><small class="mt-1 block text-base text-muted-foreground">Anonymous guest</small></span>
        </div>
      </div>
      <div class="border-t p-5">
        <span class="text-base font-medium tracking-wider text-muted-foreground">ROOM INFORMATION</span>
        <dl class="mt-5 grid grid-cols-2 gap-4 text-base text-muted-foreground">
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
        <ShieldCheck class="size-4.5 shrink-0" /><p class="text-base/relaxed">
          Only you and your visitor can access this conversation.
        </p>
      </div>
    </aside>
  </div>
</template>
