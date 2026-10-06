<script setup lang="ts">
import { authClient } from "@/lib/auth-client";

const { data: session } = await authClient.useSession(useFetch);
const isOperator = computed(() => Boolean(session.value && !session.value.user.isAnonymous));
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppNavbar :is-operator="isOperator" />
    <main>
      <slot />
    </main>
    <AppFooter />
    <ChatVisitorWidget />
  </div>
</template>
