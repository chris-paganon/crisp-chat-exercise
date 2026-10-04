<script setup lang="ts">
import logoSquare from "@/assets/images/logo-square.png";
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <header class="border-b bg-background">
      <nav class="flex h-16 items-center justify-center px-4">
        <NuxtLink
          to="/"
          class="flex items-center gap-3 font-semibold text-foreground"
          aria-label="DockIY home"
        >
          <img
            :src="logoSquare"
            alt="logo square"
            class="size-9 rounded-md"
          >
          <span class="text-base">DockIY</span>
        </NuxtLink>
      </nav>
    </header>

    <main class="flex grow flex-col">
      <slot />
    </main>
  </div>
</template>
