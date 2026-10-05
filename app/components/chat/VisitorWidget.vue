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
  <div class="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
    <Transition
      enter-active-class="origin-bottom-right transition-[opacity,transform] duration-200 motion-reduce:transition-none"
      leave-active-class="origin-bottom-right transition-[opacity,transform] duration-200 motion-reduce:transition-none"
      enter-from-class="translate-y-2 scale-95 opacity-0"
      leave-to-class="translate-y-2 scale-95 opacity-0"
    >
      <section
        v-if="open"
        id="visitor-conversation"
        class="mb-3 flex h-[min(36.875rem,calc(100dvh-7.25rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-xl sm:mb-4 sm:w-95"
        aria-label="Support conversation"
      >
        <header class="mx-4 flex shrink-0 items-center gap-3 border-b pt-5 pb-4">
          <div class="grid size-10 shrink-0 place-items-center rounded-full bg-primary bg-linear-to-b from-primary-foreground/20 to-transparent">
            <ChatCrispLogo compact />
          </div>
          <div class="min-w-0">
            <h2 class="truncate text-sm font-medium">
              {{ room?.operatorName ? `Chat with ${room.operatorName}` : "Questions? Chat with us." }}
            </h2>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ room ? "Your personal conversation" : "A little help goes a long way" }}
            </p>
          </div>
          <UiButton
            variant="ghost"
            size="icon-sm"
            class="ml-auto size-7 text-muted-foreground"
            type="button"
            aria-label="Close chat"
            @click="open = false"
          >
            <X class="size-5" />
          </UiButton>
        </header>
        <ChatConversation
          v-if="room && !joining && !error"
          :key="room.id"
          :room-id="room.id"
          :peer-name="room.operatorName ?? 'Support team'"
        />
        <div
          v-else
          class="min-h-0 flex-1 overflow-y-auto px-4 py-5"
          aria-live="polite"
        >
          <UiEmpty
            v-if="joining"
            class="min-h-55 gap-3 px-3 py-5 md:p-5"
          >
            <LoaderCircle class="size-7.5 animate-spin text-primary motion-reduce:animate-none" />
            <UiEmptyHeader>
              <h3 class="text-sm font-medium">
                Opening your conversation
              </h3><UiEmptyDescription class="text-xs">
                Getting everything ready for you…
              </UiEmptyDescription>
            </UiEmptyHeader>
          </UiEmpty>
          <UiEmpty
            v-else-if="error"
            class="min-h-55 gap-4 px-3 py-5 md:p-5"
          >
            <div class="grid size-14 place-items-center rounded-lg border bg-accent text-primary">
              <MessageSquare class="size-6" />
            </div>
            <UiEmptyHeader>
              <h3 class="text-sm font-medium">
                We couldn't connect you
              </h3><UiEmptyDescription class="max-w-68 text-xs">
                {{ error }}
              </UiEmptyDescription>
            </UiEmptyHeader>
            <UiButton
              type="button"
              variant="secondary"
              size="sm"
              @click="openConversation"
            >
              <RotateCcw class="size-4" /> Try again
            </UiButton>
          </UiEmpty>
          <template v-else>
            <div class="w-fit max-w-[95%] rounded-lg rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm/relaxed">
              Hello there 👋<br>How can we help you today?
            </div>
            <p class="mx-1 mt-2 text-xs text-muted-foreground">
              The Crisp team
            </p>
            <UiEmpty class="min-h-55 gap-4 px-3 pt-8 pb-5 md:px-3 md:pt-8 md:pb-5">
              <div class="grid size-14 place-items-center rounded-lg border bg-accent text-primary">
                <MessageSquare class="size-7" />
              </div>
              <UiEmptyHeader>
                <h3 class="text-sm font-medium">
                  Good conversations start here.
                </h3><UiEmptyDescription class="max-w-68 text-xs">
                  Opening this chat starts your private conversation with our support team.
                </UiEmptyDescription>
              </UiEmptyHeader>
            </UiEmpty>
          </template>
        </div>
        <footer class="flex shrink-0 items-center justify-center gap-2.5 px-2.5 pt-2 pb-3">
          <ChatCrispLogo class="gap-1 text-sm [&_svg]:size-3.5" /><span class="text-[0.625rem] text-muted-foreground">We run on conversations.</span>
        </footer>
      </section>
    </Transition>
    <div
      v-if="!open"
      class="absolute right-17 bottom-2.5 flex w-max items-center gap-2.5 rounded-md border bg-popover px-4 py-3 text-xs text-popover-foreground shadow-sm sm:right-19"
    >
      We're here to help <span>👋</span>
    </div>
    <UiButton
      class="ml-auto size-14 rounded-full shadow-lg transition-transform hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none sm:size-15"
      size="icon-lg"
      type="button"
      :aria-label="open ? 'Close chat' : 'Open support chat'"
      :aria-expanded="open"
      aria-controls="visitor-conversation"
      @click="open = !open"
    >
      <X
        v-if="open"
        class="size-7"
      /><MessageSquare
        v-else
        class="size-7"
        fill="currentColor"
      />
    </UiButton>
  </div>
</template>
