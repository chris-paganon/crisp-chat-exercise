<script setup lang="ts">
import logo from "@/assets/images/logo-horizontal.svg";
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <header class="border-b bg-background">
      <nav class="flex h-16 items-center justify-center px-4">
        <NuxtLink
          to="/"
          class="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Crisp home"
        >
          <img
            :src="logo"
            alt="Crisp"
            width="100"
            height="27"
            class="h-auto w-25"
          >
        </NuxtLink>
      </nav>
    </header>
    <main class="flex grow flex-col">
      <slot />
    </main>
  </div>
</template>
