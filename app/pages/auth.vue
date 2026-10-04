<script setup lang="ts">
definePageMeta({
  layout: "simple",
});

useSeoMeta({
  title: "Sign in | Dockiy",
  description: "Sign in or create a Dockiy account.",
});
</script>

<template>
  <div class="mx-auto grid w-full max-w-6xl grow items-center gap-10 px-4 py-10 md:px-8 lg:grid-cols-2">
    <section class="hidden lg:block">
      <div class="max-w-xl space-y-6">
        <div
          class="inline-flex items-center rounded-md border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground"
        >
          DockIY
        </div>
        <div class="space-y-4">
          <h1 class="text-4xl font-semibold tracking-normal text-foreground">
            Manage your workspace from one secure account.
          </h1>
          <p class="max-w-lg text-base leading-7 text-muted-foreground">
            Sign in to continue, or create an account with your email and password.
          </p>
        </div>
      </div>
    </section>

    <section class="flex justify-center lg:justify-end">
      <AuthEmailPasswordForm />
    </section>
  </div>
</template>
