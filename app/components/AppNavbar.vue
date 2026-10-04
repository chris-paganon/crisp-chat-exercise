<script setup lang="ts">
import { LogOut } from "lucide-vue-next";
import logoSquare from "@/assets/images/logo-square.png";
import { authClient } from "@/lib/auth-client";

const { data: session } = await authClient.useSession(useFetch);

const currentUser = computed(() => session.value?.user ?? null);
const userInitial = computed(() => {
  const label = currentUser.value?.name || currentUser.value?.email || "";

  return label.trim().charAt(0).toUpperCase() || "U";
});

async function logout() {
  await authClient.signOut();
  await navigateTo("/auth");
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-background">
    <nav class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
      <NuxtLink
        to="/"
        class="flex items-center gap-3 font-semibold text-foreground"
        aria-label="Dockiy home"
      >
        <img
          :src="logoSquare"
          alt="logo square"
          class="size-9 rounded-md"
        >
        <span class="text-base">Nuxt + DockIY</span>
      </NuxtLink>

      <div>
        <div
          v-if="currentUser"
          class="flex items-center"
        >
          <UiDropdownMenu>
            <UiDropdownMenuTrigger as-child>
              <UiButton
                variant="outline"
                size="icon"
                class="rounded-full"
                aria-label="Open account menu"
              >
                {{ userInitial }}
              </UiButton>
            </UiDropdownMenuTrigger>
            <UiDropdownMenuContent
              align="end"
              class="w-40"
            >
              <UiDropdownMenuItem @select="logout">
                <LogOut class="size-4" />
                Logout
              </UiDropdownMenuItem>
            </UiDropdownMenuContent>
          </UiDropdownMenu>
        </div>

        <div
          v-else
          class="flex items-center gap-2"
        >
          <UiButton
            as-child
            variant="outline"
          >
            <NuxtLink to="/auth?mode=sign-in">
              Sign in
            </NuxtLink>
          </UiButton>
          <UiButton as-child>
            <NuxtLink to="/auth?mode=sign-up">
              Sign up
            </NuxtLink>
          </UiButton>
        </div>
      </div>
    </nav>
  </header>
</template>
