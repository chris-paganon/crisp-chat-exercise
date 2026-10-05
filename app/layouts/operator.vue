<script setup lang="ts">
import { ExternalLink, Inbox, LogOut, MessageSquare, Users } from "lucide-vue-next";
import { authClient } from "@/lib/auth-client";

const { data: session } = await authClient.useSession(useFetch);
const { data: rooms } = await useOperatorRooms();
const unclaimedCount = computed(() => rooms.value.filter(room => !room.operatorName).length);
const error = ref("");

async function signOut() {
  const result = await authClient.signOut();
  if (result.error) {
    error.value = "Couldn't sign out. Please try again.";
    return;
  }
  await navigateTo("/");
}
</script>

<template>
  <div class="operator-layout grid h-dvh grid-cols-[3.5rem_minmax(0,1fr)] overflow-hidden bg-background text-sm text-foreground sm:grid-cols-[4.5rem_minmax(0,1fr)] lg:grid-cols-[14rem_minmax(0,1fr)]">
    <aside
      class="flex min-h-0 flex-col items-center border-r bg-sidebar px-1.5 pt-6 sm:px-2.5 lg:items-stretch lg:px-4"
    >
      <NuxtLink
        to="/"
        aria-label="Crisp home"
        class="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring lg:ml-2"
      >
        <ChatCrispLogo class="[&>span]:hidden lg:[&>span]:inline" />
      </NuxtLink>
      <div class="mx-2 mt-8 mb-6 hidden items-center gap-2.5 lg:flex">
        <span class="grid size-9 shrink-0 place-items-center rounded-md border bg-accent text-primary"><MessageSquare class="size-5" /></span>
        <div><strong class="text-xs font-medium">My workspace</strong><small class="mt-1 block text-xs text-muted-foreground">Personal support inbox</small></div>
      </div>
      <div class="mt-8 flex items-center justify-center gap-2.5 rounded-sm bg-sidebar-primary px-2 py-3 text-sidebar-primary-foreground shadow-xs lg:mt-0 lg:justify-start lg:px-3">
        <Inbox class="size-4.5 shrink-0" /><span class="hidden lg:inline">Inbox</span><span class="ml-auto hidden text-xs lg:inline">{{ rooms.length }}</span>
      </div>
      <span class="mx-3 mt-7 mb-3 hidden text-xs font-medium tracking-wider text-muted-foreground lg:block">YOUR INBOX</span>
      <div class="hidden items-center gap-2 rounded-sm bg-sidebar-accent px-3 py-2.5 text-xs text-sidebar-accent-foreground lg:flex">
        <MessageSquare class="size-4" /> All conversations <span class="ml-auto text-muted-foreground">{{ rooms.length }}</span>
      </div>
      <div class="hidden items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground lg:flex">
        <Users class="size-4" /> Unclaimed <span class="ml-auto">{{ unclaimedCount }}</span>
      </div>
      <div class="mt-auto w-full">
        <p
          v-if="error"
          class="mb-3 text-xs text-destructive"
          role="alert"
        >
          {{ error }}
        </p>
        <NuxtLink
          to="/"
          class="mx-2 my-4 hidden items-center gap-2 rounded-sm text-xs text-muted-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring lg:flex"
        >
          <ExternalLink class="size-4" /> View visitor website
        </NuxtLink>
        <div class="flex min-w-0 flex-col items-center gap-2.5 border-t py-4 lg:flex-row">
          <span class="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs text-primary">{{ session?.user.name.charAt(0).toUpperCase() }}</span>
          <div class="hidden min-w-0 lg:block">
            <strong class="block truncate text-xs font-medium">{{ session?.user.name }}</strong><small class="mt-0.5 block text-xs text-muted-foreground">Operator</small>
          </div>
          <UiButton
            type="button"
            variant="ghost"
            size="icon-sm"
            class="size-7 text-muted-foreground lg:ml-auto"
            aria-label="Sign out"
            @click="signOut"
          >
            <LogOut class="size-4" />
          </UiButton>
        </div>
      </div>
    </aside>

    <slot />
  </div>
</template>

<style scoped>
@media (width < 40rem) {
  .operator-layout:has([data-mobile-conversation="true"]) {
    grid-template-columns: minmax(0, 1fr);
  }

  .operator-layout:has([data-mobile-conversation="true"]) > aside {
    display: none;
  }
}
</style>
