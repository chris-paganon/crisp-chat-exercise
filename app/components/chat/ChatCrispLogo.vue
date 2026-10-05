<script setup lang="ts">
import { MessageSquare } from "lucide-vue-next";

defineProps<{ compact?: boolean }>();
</script>

<template>
  <span
    class="inline-flex items-center gap-2.5 text-3xl leading-none font-bold tracking-tight text-foreground"
    :class="{ 'text-primary-foreground': compact }"
  >
    <MessageSquare
      class="-rotate-7"
      :class="compact ? 'size-6 fill-current' : 'size-8 fill-primary text-primary'"
      :stroke-width="2.5"
      aria-hidden="true"
    />
    <span v-if="!compact">crisp<span class="text-primary">.</span></span>
  </span>
</template>
