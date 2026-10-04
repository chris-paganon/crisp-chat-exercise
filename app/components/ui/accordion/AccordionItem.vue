<script setup lang="ts">
import type { AccordionItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { AccordionItem, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<AccordionItemProps & {
  class?: HTMLAttributes["class"];
  variant?: "default" | "feature";
}>(), {
  variant: "default",
});

const delegatedProps = reactiveOmit(props, "class", "variant");

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <AccordionItem
    v-slot="slotProps"
    data-slot="accordion-item"
    :data-variant="variant"
    v-bind="forwardedProps"
    :class="cn(
      variant === 'feature'
        ? 'rounded-sm border bg-background px-6 transition-colors motion-reduce:transition-none data-[state=open]:border-primary data-[state=open]:bg-accent data-[state=open]:[&_[data-slot=accordion-trigger]]:text-primary'
        : 'border-b last:border-b-0',
      props.class,
    )"
  >
    <slot v-bind="slotProps" />
  </AccordionItem>
</template>
