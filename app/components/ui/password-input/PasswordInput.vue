<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { useVModel } from "@vueuse/core";
import { Eye, EyeOff } from "lucide-vue-next";
import { cn } from "@/lib/utils";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  defaultValue?: string;
  modelValue?: string;
  class?: HTMLAttributes["class"];
}>();

const emits = defineEmits<{
  (e: "update:modelValue", payload: string): void;
}>();

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
});

const isPasswordVisible = ref(false);
</script>

<template>
  <div
    class="relative"
    data-slot="password-input"
  >
    <UiInput
      v-bind="$attrs"
      v-model="modelValue"
      :class="cn('pr-10', props.class)"
      :default-value="props.defaultValue"
      :type="isPasswordVisible ? 'text' : 'password'"
    />
    <UiButton
      type="button"
      variant="ghost"
      size="icon"
      class="absolute top-1/2 right-0 -translate-y-1/2 hover:bg-transparent"
      :aria-label="isPasswordVisible ? 'Hide password' : 'Show password'"
      :aria-pressed="isPasswordVisible"
      @click="isPasswordVisible = !isPasswordVisible"
    >
      <EyeOff
        v-if="isPasswordVisible"
        aria-hidden="true"
      />
      <Eye
        v-else
        aria-hidden="true"
      />
    </UiButton>
  </div>
</template>
