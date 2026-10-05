<script setup lang="ts">
import { ArrowLeft, Inbox } from "lucide-vue-next";
import ChatConversation from "@/components/chat/ChatConversation.vue";

definePageMeta({ layout: "operator", middleware: "operator" });
useSeoMeta({ title: "Inbox | Crisp" });
const { data: rooms } = await useOperatorRooms();

const selectedId = useRouteQuery<string>("room", "");
const selected = computed(() => rooms.value.find(room => room.id === selectedId.value && room.operatorName));
const mobileConversation = ref(Boolean(selectedId.value));
</script>

<template>
  <div
    class="grid min-h-0 min-w-0 grid-cols-1 overflow-hidden sm:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-[22rem_minmax(0,1fr)]"
    :data-mobile-conversation="mobileConversation"
    :class="selected ? 'xl:grid-cols-[22rem_minmax(0,1fr)]' : ''"
  >
    <OperatorInbox
      :class="mobileConversation ? 'hidden sm:flex' : 'flex'"
      @open="mobileConversation = true"
      @claim-error="mobileConversation = false"
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
            </h2>
          </div>
        </header>
        <ChatConversation
          :key="selected.id"
          :room-id="selected.id"
          peer-name="Visitor"
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
  </div>
</template>
