<script setup lang="ts">
definePageMeta({
  layout: "simple",
});

useSeoMeta({
  title: "Operator sign in | Crisp",
  description: "Sign in or create your operator account.",
});
</script>

<template>
  <div class="mx-auto grid w-full max-w-6xl grow items-center gap-10 px-4 py-10 md:px-8 lg:grid-cols-2">
    <section class="hidden lg:block">
      <div class="max-w-xl space-y-6">
        <div
          class="inline-flex items-center rounded-md border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground"
        >
          Crisp workspace
        </div>
        <div class="space-y-4">
          <h1 class="text-4xl font-semibold tracking-normal text-foreground">
            A human connection starts with you.
          </h1>
          <p class="max-w-lg text-base leading-7 text-muted-foreground">
            Sign in or create an operator account to help visitors. Open an unclaimed conversation in your inbox to join it.
          </p>
        </div>
      </div>
    </section>

    <section class="flex justify-center lg:justify-end">
      <AuthEmailPasswordForm />
    </section>
  </div>
</template>
