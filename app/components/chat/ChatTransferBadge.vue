<script setup lang="ts">
import type { TransferSummary } from "@/lib/file-transfer/model";

defineProps<{ summary?: TransferSummary }>();
</script>

<template>
  <span
    v-if="summary"
    class="mt-2 inline-block max-w-full truncate rounded border px-2 py-1 text-xs font-medium"
    :class="summary.failed ? 'border-destructive/20 bg-destructive/5 text-destructive' : 'border-primary/20 bg-primary/5 text-primary'"
  >
    {{ summary.label }}
  </span>
</template>
