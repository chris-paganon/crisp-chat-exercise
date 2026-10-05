<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import { useForm } from "vee-validate";
import { toast } from "vue-sonner";
import { computed, watch } from "vue";
import * as z from "zod";
import { authClient } from "@/lib/auth-client";
import { getAuthRedirect } from "@/lib/auth-redirect";

const mode = useRouteQuery<"sign-in" | "sign-up">("mode", "sign-in");
const route = useRoute();
const redirectPath = computed(() => getAuthRedirect(route.query.redirect));
const { data: authProviders } = await useFetch("/api/auth-providers");

const isSignUp = computed(() => mode.value === "sign-up");
onMounted(() => {
  if (typeof route.query.error === "string") {
    toast.error("Google sign-in failed. Please try again.");
  }
});
const verificationEmail = ref("");
const isVerificationPending = computed(() => Boolean(verificationEmail.value));
const isResendingVerification = ref(false);
const isGooglePending = ref(false);

const formSchema = toTypedSchema(z.object({
  name: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  rememberMe: z.boolean().default(true),
}).superRefine((values, ctx) => {
  if (isSignUp.value && !values.name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter your name.",
      path: ["name"],
    });
  }
}));

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    name: "",
    email: "",
    password: "",
    rememberMe: true,
  },
});

watch(mode, () => {
  form.setFieldError("name", undefined);
});

const submitLabel = computed(() => isSignUp.value ? "Create account" : "Sign in");
const alternateActionLabel = computed(() => isSignUp.value ? "Sign in instead" : "Create an account");

async function signInWithGoogle() {
  isGooglePending.value = true;

  try {
    const errorCallbackURL = `/auth?${new URLSearchParams({
      mode: isSignUp.value ? "sign-up" : "sign-in",
      redirect: redirectPath.value,
    })}`;
    const response = await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectPath.value,
      errorCallbackURL,
    });

    if (response.error) {
      toast.error(response.error.message || "Google sign-in failed. Please try again.");
    }
  }
  catch {
    toast.error("Google sign-in failed. Please try again.");
  }
  finally {
    isGooglePending.value = false;
  }
}

const onSubmit = form.handleSubmit(async (values) => {
  const response = isSignUp.value
    ? await authClient.signUp.email({
        name: values.name ?? "",
        email: values.email,
        password: values.password,
        callbackURL: redirectPath.value,
      })
    : await authClient.signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
        callbackURL: redirectPath.value,
      });

  if (response.error) {
    if (response.error.code === "EMAIL_NOT_VERIFIED") {
      verificationEmail.value = values.email;
      return;
    }

    toast.error(response.error.message || "Authentication failed. Please try again.");
    return;
  }

  if (isSignUp.value) {
    verificationEmail.value = values.email;
    return;
  }

  await navigateTo(redirectPath.value);
});

async function resendVerificationEmail() {
  isResendingVerification.value = true;

  const response = await authClient.sendVerificationEmail({
    email: verificationEmail.value,
    callbackURL: redirectPath.value,
  });

  isResendingVerification.value = false;

  if (response.error) {
    toast.error(response.error.message || "Unable to resend the verification email. Please try again.");
    return;
  }

  toast.success("A new verification link has been sent.");
}

function returnToSignIn() {
  verificationEmail.value = "";
  mode.value = "sign-in";
}
</script>

<template>
  <UiCard class="w-full max-w-md border-border/70 shadow-sm">
    <UiCardHeader class="space-y-3">
      <div class="space-y-1">
        <UiCardTitle class="text-2xl">
          {{ isVerificationPending ? "Check your inbox" : isSignUp ? "Create your account" : "Welcome back" }}
        </UiCardTitle>
        <UiCardDescription>
          {{ isVerificationPending ? `We sent a verification link to ${verificationEmail}.` : isSignUp ? "Create your operator account with your email and password." : "Sign in with your email and password." }}
        </UiCardDescription>
      </div>

      <UiTabs
        v-if="!isVerificationPending"
        v-model="mode"
        class="w-full"
      >
        <UiTabsList class="grid w-full grid-cols-2">
          <UiTabsTrigger value="sign-in">
            Sign in
          </UiTabsTrigger>
          <UiTabsTrigger value="sign-up">
            Sign up
          </UiTabsTrigger>
        </UiTabsList>
      </UiTabs>
    </UiCardHeader>

    <UiCardContent>
      <div
        v-if="isVerificationPending"
        class="space-y-5"
      >
        <p class="text-sm leading-6 text-muted-foreground">
          Open the link in the email to verify your address and finish signing in.
        </p>

        <UiButton
          class="w-full"
          type="button"
          variant="outline"
          :disabled="isResendingVerification"
          @click="resendVerificationEmail"
        >
          Resend email
        </UiButton>
      </div>

      <form
        v-else
        class="space-y-5"
        @submit="onSubmit"
      >
        <template v-if="authProviders?.google">
          <UiButton
            class="w-full"
            type="button"
            variant="outline"
            :disabled="isGooglePending || form.isSubmitting.value"
            @click="signInWithGoogle"
          >
            <svg
              aria-hidden="true"
              class="size-4"
              viewBox="0 0 24 24"
            >
              <path
                fill="#4285F4"
                d="M21.35 12.21c0-.71-.06-1.38-.18-2.04H12v3.87h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.21Z"
              />
              <path
                fill="#34A853"
                d="M12 21.5c2.63 0 4.84-.87 6.44-2.36l-3.14-2.44c-.87.58-1.98.93-3.3.93-2.54 0-4.69-1.71-5.46-4.01H3.3v2.52A9.5 9.5 0 0 0 12 21.5Z"
              />
              <path
                fill="#FBBC05"
                d="M6.54 13.62a5.7 5.7 0 0 1 0-3.24V7.86H3.3a9.5 9.5 0 0 0 0 8.28l3.24-2.52Z"
              />
              <path
                fill="#EA4335"
                d="M12 6.37c1.43 0 2.71.49 3.72 1.47l2.78-2.78A9.5 9.5 0 0 0 3.3 7.86l3.24 2.52c.77-2.3 2.92-4.01 5.46-4.01Z"
              />
            </svg>
            {{ isGooglePending ? "Connecting…" : "Continue with Google" }}
          </UiButton>

          <div class="flex items-center gap-3 text-xs text-muted-foreground">
            <div class="h-px grow bg-border" />
            <span>or continue with email</span>
            <div class="h-px grow bg-border" />
          </div>
        </template>

        <UiFormField
          v-if="isSignUp"
          v-slot="{ componentField }"
          name="name"
        >
          <UiFormItem>
            <UiFormLabel>Name</UiFormLabel>
            <UiFormControl>
              <UiInput
                autocomplete="name"
                placeholder="Jane Doe"
                type="text"
                v-bind="componentField"
              />
            </UiFormControl>
            <UiFormMessage />
          </UiFormItem>
        </UiFormField>

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

        <UiFormField
          v-slot="{ componentField }"
          name="password"
        >
          <UiFormItem>
            <UiFormLabel>Password</UiFormLabel>
            <UiFormControl>
              <UiPasswordInput
                :autocomplete="isSignUp ? 'new-password' : 'current-password'"
                v-bind="componentField"
              />
            </UiFormControl>
            <UiFormMessage />
          </UiFormItem>
        </UiFormField>

        <UiFormField
          v-if="!isSignUp"
          v-slot="{ value, handleChange }"
          name="rememberMe"
        >
          <UiFormItem class="flex flex-row items-center gap-3 space-y-0">
            <UiFormControl>
              <UiCheckbox
                :model-value="value"
                @update:model-value="handleChange"
              />
            </UiFormControl>
            <UiFormLabel class="text-sm font-normal">
              Remember me
            </UiFormLabel>
          </UiFormItem>
        </UiFormField>

        <UiButton
          class="w-full"
          type="submit"
          :disabled="form.isSubmitting.value || isGooglePending"
        >
          {{ submitLabel }}
        </UiButton>

        <div
          v-if="!isSignUp"
          class="text-center"
        >
          <NuxtLink
            class="text-sm font-medium text-primary underline-offset-4 hover:underline"
            to="/forgot-password"
          >
            Forgot password?
          </NuxtLink>
        </div>
      </form>
    </UiCardContent>

    <UiCardFooter class="justify-center border-t pt-6">
      <UiButton
        type="button"
        variant="link"
        class="h-auto px-0"
        @click="isVerificationPending ? returnToSignIn() : mode = isSignUp ? 'sign-in' : 'sign-up'"
      >
        {{ isVerificationPending ? "Back to sign in" : alternateActionLabel }}
      </UiButton>
    </UiCardFooter>
  </UiCard>
</template>
