<script setup lang="ts">
import { Check } from "lucide-vue-next";
import joe from "@/assets/images/specific-needs/customer-joe.jpg";
import agent from "@/assets/images/specific-needs/customer-service-agent-8.png";

const conversation = useTemplateRef<HTMLDivElement>("conversation");
const { messageClasses, visibleMessages } = useConversationAnimation(conversation, [0, 1200, 2800]);
</script>

<template>
  <div
    ref="conversation"
    role="img"
    aria-label="Joe asks about the privacy policy, receives a templated WhatsApp message and thanks the team for the quick answer."
    class="@container mx-auto w-full max-w-120"
  >
    <div
      aria-hidden="true"
      class="px-0 pb-12 text-sm/5 @sm:px-6 @sm:pb-22 @sm:text-base/6"
    >
      <div
        :class="messageClasses"
        :data-visible="visibleMessages >= 1"
      >
        <div class="flex items-start gap-2.5">
          <img
            :src="joe"
            alt=""
            width="480"
            height="480"
            loading="lazy"
            class="size-8 shrink-0 rounded-full object-cover @sm:size-9"
          >
          <span class="pt-1 text-muted-foreground/70">Joe</span>
        </div>
        <p class="conversation-bubble -mt-1 ml-10 max-w-72 rounded-lg bg-background px-4 py-3 @sm:ml-12">
          Hello, can I know more about your privacy policy ?
        </p>
      </div>

      <div
        class="mt-4"
        :class="messageClasses"
        :data-visible="visibleMessages >= 2"
      >
        <div class="conversation-bubble mr-10 ml-auto max-w-77 rounded-lg bg-primary p-3.5 text-primary-foreground @sm:mr-12">
          <p>
            You can know more about our privacy policy by going to the following link:
            <span class="block underline underline-offset-2">https://crisp.chat/privacy</span>
          </p>
          <div class="mt-1.5 flex h-10 items-center justify-center rounded-lg bg-muted font-bold text-primary shadow-[inset_0_1px_0_var(--color-background)]">
            Privacy statement
          </div>
        </div>
        <div class="-mt-3 flex items-end justify-end gap-2.5">
          <span class="flex items-center gap-1 pb-1 text-xs/4 text-muted-foreground">
            <Check class="size-3.5" />
            Delivered to WhatsApp
          </span>
          <div class="blue-gray-gradient flex size-8 shrink-0 justify-center overflow-hidden rounded-full @sm:size-9">
            <img
              :src="agent"
              alt=""
              width="600"
              height="755"
              loading="lazy"
              class="h-full w-4/5 object-contain"
            >
          </div>
        </div>
      </div>

      <div
        class="mt-4"
        :class="messageClasses"
        :data-visible="visibleMessages >= 3"
      >
        <div class="flex items-start gap-2.5">
          <img
            :src="joe"
            alt=""
            width="480"
            height="480"
            loading="lazy"
            class="size-8 shrink-0 rounded-full object-cover @sm:size-9"
          >
          <span class="pt-1 text-muted-foreground/70">Joe</span>
        </div>
        <p class="conversation-bubble -mt-1 ml-10 w-fit rounded-lg bg-background px-4 py-3.5 @sm:ml-12">
          Thank you for the quick answer :)
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conversation-bubble {
  /* The reference uses four progressively softer blue drop shadows. */
  box-shadow:
    0 0.25rem 0.2rem color-mix(in srgb, var(--color-primary) 2.5%, transparent),
    0 0.75rem 0.5rem color-mix(in srgb, var(--color-primary) 3.5%, transparent),
    0 1.75rem 1.5rem color-mix(in srgb, var(--color-primary) 4.5%, transparent),
    0 5.5rem 4.5rem color-mix(in srgb, var(--color-primary) 7%, transparent);
}
</style>
