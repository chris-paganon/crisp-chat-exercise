<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    data-slot="card-footer"
    :class="cn('flex items-center px-8 [.border-t]:pt-8', props.class)"
  >
    <slot />
  </div>
</template>
