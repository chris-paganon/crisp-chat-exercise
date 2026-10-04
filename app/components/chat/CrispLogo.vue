<script setup lang="ts">
import { MessageSquare } from "lucide-vue-next";

defineProps<{ compact?: boolean }>();
</script>

<template>
  <span
    class="crisp-logo"
    :class="{ 'crisp-logo-compact': compact }"
  >
    <MessageSquare
      class="crisp-logo-symbol"
      :stroke-width="2.5"
      aria-hidden="true"
    />
    <span v-if="!compact">crisp<span class="crisp-logo-dot">.</span></span>
  </span>
</template>
