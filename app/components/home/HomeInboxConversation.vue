<script setup lang="ts">
import { Bot, Check } from "lucide-vue-next";
import joe from "@/assets/images/specific-needs/customer-joe.jpg";
import recoverPassword from "@/assets/images/get-to-know/recover-password.png";

const conversation = useTemplateRef<HTMLDivElement>("conversation");
const { messageClasses, visibleMessages } = useConversationAnimation(conversation, [0, 1200, 1800, 2800, 3800]);
</script>

<template>
  <div
    ref="conversation"
    role="img"
    aria-label="Joe asks to reset his password. An automated assistant replies with a password recovery article, Joe says thank you, and the assistant asks him to rate the support."
    class="blue-gray-gradient @container relative isolate aspect-4/5 w-full max-w-148 overflow-hidden rounded-2xl"
  >
    <div
      aria-hidden="true"
      class="conversation-content absolute inset-0 mask-b-from-85% mask-b-to-100% p-12 text-[3cqw] leading-[1.55]"
    >
      <div
        :class="messageClasses"
        :data-visible="visibleMessages >= 1"
      >
        <div class="flex items-start gap-3">
          <img
            :src="joe"
            alt=""
            width="480"
            height="480"
            loading="lazy"
            class="size-10 shrink-0 rounded-full object-cover"
          >
          <span class="pt-1 font-medium text-muted-foreground/50">Joe</span>
        </div>
        <p class="conversation-bubble -mt-1 ml-13 w-4/5 max-w-88 rounded-lg bg-background p-4">
          Hello, I lost my password.
        </p>
      </div>

      <p
        class="conversation-bubble mt-4 mr-13 ml-auto max-w-88 rounded-lg bg-primary p-3.5 text-primary-foreground"
        :class="messageClasses"
        :data-visible="visibleMessages >= 2"
      >
        Hello Joe, here is an article on how to reset your password.
      </p>

      <div
        class="mt-1.5"
        :class="messageClasses"
        :data-visible="visibleMessages >= 3"
      >
        <div class="conversation-bubble mr-13 ml-auto max-w-88 rounded-lg bg-primary p-3.5 text-primary-foreground">
          <p class="wrap-anywhere underline underline-offset-2">
            https://help.acme.com/how-to-reset-password
          </p>
          <img
            :src="recoverPassword"
            alt=""
            width="316"
            height="115"
            loading="lazy"
            class="mt-1.5 h-auto w-full rounded-sm"
          >
        </div>
        <div class="-mt-3 flex items-end justify-end gap-3">
          <span class="flex items-center gap-1 pb-1 text-[0.75em] text-muted-foreground">
            <Check class="size-4" />
            Delivered
          </span>
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot class="size-6" />
          </span>
        </div>
      </div>

      <div
        class="mt-4"
        :class="messageClasses"
        :data-visible="visibleMessages >= 4"
      >
        <div class="flex items-start gap-3">
          <img
            :src="joe"
            alt=""
            width="480"
            height="480"
            loading="lazy"
            class="size-10 shrink-0 rounded-full object-cover"
          >
          <span class="pt-1 font-medium text-muted-foreground/50">Joe</span>
        </div>
        <p class="conversation-bubble -mt-1 ml-13 w-fit rounded-lg bg-background p-4">
          Thank you !
        </p>
      </div>

      <p
        class="conversation-bubble mt-4 mr-13 ml-auto max-w-71 rounded-lg bg-primary p-3.5 text-primary-foreground"
        :class="messageClasses"
        :data-visible="visibleMessages >= 5"
      >
        Thanks for chatting with us. Would you mind rating our support?
      </p>
    </div>
  </div>
</template>

<style scoped>
.conversation-content {
  /* Scale the conversation together so every message fits on smaller cards. */
  --spacing: calc(100cqw / 148);
}

.conversation-bubble {
  box-shadow: 0 2rem 3rem -1rem color-mix(in srgb, var(--color-primary) 20%, transparent);
}
</style>
