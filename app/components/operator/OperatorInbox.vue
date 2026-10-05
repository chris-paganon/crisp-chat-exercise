<script setup lang="ts">
import { LoaderCircle, MessageSquare, RefreshCw } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { chatError } from "@/lib/chat-error";
import type { ChatRoom } from "~~/shared/types/chat";

const emit = defineEmits<{ open: []; claimError: [] }>();
const { data: rooms, error: loadError, status, refresh } = await useOperatorRooms();

const selectedId = useRouteQuery<string>("room", "");
const busy = ref(false);

// Refresh the inbox for newly opened or claimed visitor rooms.
const { pause, resume } = useIntervalFn(() => {
  void refresh();
}, 5000, { immediate: false });

onMounted(() => {
  resume();

  if (selectedId.value) {
    void selectRoom(selectedId.value);
  }
});
onBeforeUnmount(pause);

async function selectRoom(id: string) {
  if (busy.value) return;
  busy.value = true;
  try {
    const current = rooms.value.find(room => room.id === id);
    if (!current?.operatorName) {
      const claimed = await $fetch<ChatRoom>(`/api/rooms/${id}/claim`, { method: "POST" });
      rooms.value = [claimed, ...rooms.value.filter(room => room.id !== id)];
    }
    selectedId.value = id;
    emit("open");
  }
  catch (cause) {
    await refresh();
    toast.error(chatError(cause, "Couldn't open the conversation. Please try again."));
    emit("claimError");
  }
  finally { busy.value = false; }
}
function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
</script>

<template>
  <section
    class="flex min-h-0 min-w-0 flex-col overflow-hidden border-r"
    aria-label="Conversations"
  >
    <header class="shrink-0 px-5 pt-6 pb-5">
      <h1 class="text-2xl font-medium tracking-tight">
        Inbox
      </h1>
    </header>
    <div class="flex shrink-0 items-center justify-between border-b px-5 pb-3 text-base font-medium text-muted-foreground">
      <span>All conversations</span>
      <UiButton
        type="button"
        variant="ghost"
        size="icon-sm"
        class="size-6 text-muted-foreground"
        aria-label="Refresh conversations"
        :disabled="status === 'pending'"
        @click="refresh()"
      >
        <RefreshCw class="size-3.5" />
      </UiButton>
    </div>
    <UiEmpty
      v-if="loadError"
      class="gap-3 rounded-none px-4 py-8 md:p-4"
      role="alert"
    >
      <p class="text-base text-muted-foreground">
        Couldn't load your conversations.
      </p>
      <UiButton
        variant="secondary"
        size="default"
        type="button"
        @click="refresh()"
      >
        Try again
      </UiButton>
    </UiEmpty>
    <UiEmpty
      v-else-if="status !== 'success'"
      class="gap-3 rounded-none px-4 py-8 md:p-4"
      role="status"
    >
      <LoaderCircle class="size-6 animate-spin text-primary motion-reduce:animate-none" /><p class="text-base text-muted-foreground">
        Loading conversations…
      </p>
    </UiEmpty>
    <UiEmpty
      v-else-if="!rooms.length"
      class="gap-3 rounded-none px-4 py-8 md:p-4"
    >
      <MessageSquare class="size-7.5 text-muted-foreground" /><h2 class="text-base font-medium text-muted-foreground">
        Waiting for visitors
      </h2><p class="text-base/relaxed text-muted-foreground">
        New conversations appear here when visitors open the chat.
      </p>
    </UiEmpty>
    <div
      v-else
      class="min-h-0 flex-1 overflow-y-auto p-2"
    >
      <button
        v-for="room in rooms"
        :key="room.id"
        type="button"
        class="relative flex w-full items-center gap-3 rounded-md px-3 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
        :class="selectedId === room.id ? 'bg-accent before:absolute before:inset-y-4 before:left-0 before:w-0.75 before:rounded-full before:bg-primary' : 'hover:bg-muted'"
        :aria-current="selectedId === room.id ? 'true' : undefined"
        :disabled="busy"
        @click="selectRoom(room.id)"
      >
        <span class="relative grid size-9 shrink-0 place-items-center rounded-full border bg-muted text-muted-foreground">V<span
          v-if="room.operatorName"
          class="absolute -right-px -bottom-px size-2.5 rounded-full border-2 border-background bg-chart-2"
        /></span>
        <span class="block min-w-0 flex-1">
          <span class="flex items-center gap-2"><strong class="truncate text-base font-medium">{{ room.title }}</strong><small class="ml-auto shrink-0 text-base text-muted-foreground">{{ dateLabel(room.createdAt) }}</small></span>
          <span class="mt-1.5 block truncate text-base text-muted-foreground">{{ room.operatorName ? 'Claimed by you' : 'Unclaimed · Open to join' }}</span>
        </span>
      </button>
    </div>
  </section>
</template>
