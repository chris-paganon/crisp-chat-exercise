<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import { useForm } from "vee-validate";
import { toast } from "vue-sonner";
import { computed } from "vue";
import * as z from "zod";
import { authClient } from "@/lib/auth-client";

definePageMeta({
  layout: "simple",
});

useSeoMeta({
  title: "Reset password | Dockiy",
  description: "Choose a new password for your Dockiy account.",
});

const route = useRoute();
const token = computed(() => typeof route.query.token === "string" ? route.query.token : "");
const tokenRejected = ref(false);
const isInvalidToken = computed(() => !token.value || route.query.error === "INVALID_TOKEN" || tokenRejected.value);
const isComplete = ref(false);

const formSchema = toTypedSchema(z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().min(1, "Confirm your new password."),
}).refine(values => values.password === values.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
}));

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    password: "",
    confirmPassword: "",
  },
});

const onSubmit = form.handleSubmit(async (values) => {
  const response = await authClient.resetPassword({
    newPassword: values.password,
    token: token.value,
  });

  if (response.error) {
    if (response.error.code === "INVALID_TOKEN") {
      tokenRejected.value = true;
      return;
    }

    toast.error(response.error.message || "Unable to reset your password. Please try again.");
    return;
  }

  isComplete.value = true;
});
</script>

<template>
  <div class="mx-auto flex w-full max-w-md grow items-center px-4 py-10">
    <UiCard class="w-full border-border/70 shadow-sm">
      <template v-if="isComplete">
        <UiCardHeader class="space-y-3">
          <div class="space-y-1">
            <UiCardTitle class="text-2xl">
              Password updated
            </UiCardTitle>
            <UiCardDescription>
              Your new password is ready to use.
            </UiCardDescription>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <UiButton
            as-child
            class="w-full"
          >
            <NuxtLink to="/auth?mode=sign-in">
              Sign in
            </NuxtLink>
          </UiButton>
        </UiCardContent>
      </template>

      <template v-else-if="isInvalidToken">
        <UiCardHeader class="space-y-3">
          <div class="space-y-1">
            <UiCardTitle class="text-2xl">
              Reset link unavailable
            </UiCardTitle>
            <UiCardDescription>
              This password reset link is invalid or has expired.
            </UiCardDescription>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <UiButton
            as-child
            class="w-full"
          >
            <NuxtLink to="/forgot-password">
              Request a new link
            </NuxtLink>
          </UiButton>
        </UiCardContent>
      </template>

      <template v-else>
        <UiCardHeader class="space-y-3">
          <div class="space-y-1">
            <UiCardTitle class="text-2xl">
              Choose a new password
            </UiCardTitle>
            <UiCardDescription>
              Enter a new password for your Dockiy account.
            </UiCardDescription>
          </div>
        </UiCardHeader>

        <UiCardContent>
          <form
            class="space-y-5"
            @submit="onSubmit"
          >
            <UiFormField
              v-slot="{ componentField }"
              name="password"
            >
              <UiFormItem>
                <UiFormLabel>New password</UiFormLabel>
                <UiFormControl>
                  <UiPasswordInput
                    autocomplete="new-password"
                    v-bind="componentField"
                  />
                </UiFormControl>
                <UiFormMessage />
              </UiFormItem>
            </UiFormField>

            <UiFormField
              v-slot="{ componentField }"
              name="confirmPassword"
            >
              <UiFormItem>
                <UiFormLabel>Confirm new password</UiFormLabel>
                <UiFormControl>
                  <UiPasswordInput
                    autocomplete="new-password"
                    v-bind="componentField"
                  />
                </UiFormControl>
                <UiFormMessage />
              </UiFormItem>
            </UiFormField>

            <UiButton
              class="w-full"
              type="submit"
              :disabled="form.isSubmitting.value"
            >
              Reset password
            </UiButton>
          </form>
        </UiCardContent>
      </template>
    </UiCard>
  </div>
</template>
