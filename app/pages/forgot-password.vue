<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import { useForm } from "vee-validate";
import { toast } from "vue-sonner";
import * as z from "zod";
import { authClient } from "@/lib/auth-client";

definePageMeta({
  layout: "simple",
});

useSeoMeta({
  title: "Forgot password | Dockiy",
  description: "Request a password reset link for your Dockiy account.",
});

const isComplete = ref(false);
const submittedEmail = ref("");

const formSchema = toTypedSchema(z.object({
  email: z.string().trim().email("Enter a valid email address."),
}));

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    email: "",
  },
});

const onSubmit = form.handleSubmit(async (values) => {
  const response = await authClient.requestPasswordReset({
    email: values.email,
    redirectTo: "/reset-password",
  });

  if (response.error) {
    toast.error(response.error.message || "Unable to send a reset link. Please try again.");
    return;
  }

  submittedEmail.value = values.email;
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
              Check your inbox
            </UiCardTitle>
            <UiCardDescription>
              If an account exists for {{ submittedEmail }}, a password reset link is on its way.
            </UiCardDescription>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <UiButton
            as-child
            class="w-full"
            variant="outline"
          >
            <NuxtLink to="/auth?mode=sign-in">
              Back to sign in
            </NuxtLink>
          </UiButton>
        </UiCardContent>
      </template>

      <template v-else>
        <UiCardHeader class="space-y-3">
          <div class="space-y-1">
            <UiCardTitle class="text-2xl">
              Reset your password
            </UiCardTitle>
            <UiCardDescription>
              Enter your email address and we will send you a secure reset link.
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
              name="email"
            >
              <UiFormItem>
                <UiFormLabel>Email</UiFormLabel>
                <UiFormControl>
                  <UiInput
                    autocomplete="email"
                    inputmode="email"
                    placeholder="you@example.com"
                    type="email"
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
              Send reset link
            </UiButton>
          </form>
        </UiCardContent>

        <UiCardFooter class="justify-center border-t pt-6">
          <UiButton
            as-child
            class="h-auto px-0"
            variant="link"
          >
            <NuxtLink to="/auth?mode=sign-in">
              Back to sign in
            </NuxtLink>
          </UiButton>
        </UiCardFooter>
      </template>
    </UiCard>
  </div>
</template>
