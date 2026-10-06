<script setup lang="ts">
import { Menu } from "lucide-vue-next";
import logo from "@/assets/images/logo-horizontal.svg";
import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";

defineProps<{ isOperator: boolean }>();

// TODO: Replace with actual internal links (more in the template too)
const navigation = [
  {
    label: "Features",
    children: [
      { label: "Shared inbox", href: "https://crisp.chat/en/shared-inbox/" },
      { label: "Live chat", href: "https://crisp.chat/en/livechat/" },
      { label: "Chatbot", href: "https://crisp.chat/en/chatbot/" },
    ],
  },
  { label: "Apps", href: "https://crisp.chat/en/apps/" },
  { label: "Pricing", href: "https://crisp.chat/en/pricing/" },
  { label: "Integrations", href: "https://crisp.chat/en/integrations/" },
  {
    label: "Help",
    children: [
      { label: "Help center", href: "https://help.crisp.chat/en/" },
      { label: "Contact us", href: "https://crisp.chat/en/contact/" },
    ],
  },
];
</script>

<template>
  <header class="absolute inset-x-0 top-0 z-30">
    <div class="mx-auto flex h-18 max-w-7xl items-center gap-6 px-6 py-10 lg:h-10 lg:gap-7">
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

      <UiNavigationMenu
        class="hidden lg:flex"
        aria-label="Main navigation"
      >
        <UiNavigationMenuList class="gap-2">
          <UiNavigationMenuItem
            v-for="item in navigation"
            :key="item.label"
          >
            <template v-if="item.children">
              <UiNavigationMenuTrigger>{{ item.label }}</UiNavigationMenuTrigger>
              <UiNavigationMenuContent class="w-56 p-3 md:w-56">
                <UiNavigationMenuLink
                  v-for="child in item.children"
                  :key="child.label"
                  :href="child.href"
                  class="text-base"
                >
                  {{ child.label }}
                </UiNavigationMenuLink>
              </UiNavigationMenuContent>
            </template>
            <UiNavigationMenuLink
              v-else
              :href="item.href"
              :class="navigationMenuTriggerStyle()"
            >
              {{ item.label }}
            </UiNavigationMenuLink>
          </UiNavigationMenuItem>
        </UiNavigationMenuList>
      </UiNavigationMenu>

      <div class="ml-auto hidden items-center gap-3 lg:flex">
        <UiButton
          v-if="!isOperator"
          as-child
          variant="ghost"
        >
          <NuxtLink
            to="/auth?mode=sign-in&redirect=/operator"
          >Log in</NuxtLink>
        </UiButton>
        <UiButton
          as-child
          variant="secondary"
        >
          <NuxtLink :to="isOperator ? '/operator' : '/auth?mode=sign-up&redirect=/operator'">
            {{ isOperator ? "Open inbox" : "Get started" }}
          </NuxtLink>
        </UiButton>
      </div>
      <UiSheet>
        <UiSheetTrigger as-child>
          <UiButton
            variant="ghost"
            size="icon"
            class="ml-auto lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu class="size-6" />
          </UiButton>
        </UiSheetTrigger>
        <UiSheetContent class="overflow-y-auto">
          <UiSheetHeader>
            <UiSheetTitle>Explore Crisp</UiSheetTitle>
            <UiSheetDescription class="sr-only">
              Navigation and account links
            </UiSheetDescription>
          </UiSheetHeader>
          <nav
            aria-label="Mobile navigation"
            class="space-y-4 px-4 pb-6 text-secondary-foreground"
          >
            <div
              v-for="item in navigation"
              :key="item.label"
            >
              <template v-if="item.children">
                <p class="px-3 pb-1 text-sm text-muted-foreground">
                  {{ item.label }}
                </p>
                <UiSheetClose
                  v-for="child in item.children"
                  :key="child.label"
                  as-child
                >
                  <a
                    :href="child.href"
                    class="block rounded-sm px-3 py-2 font-medium hover:bg-accent focus-visible:outline-ring"
                  >
                    {{ child.label }}
                  </a>
                </UiSheetClose>
              </template>
              <UiSheetClose
                v-else
                as-child
              >
                <a
                  :href="item.href"
                  class="block rounded-sm px-3 py-2 font-medium hover:bg-accent focus-visible:outline-ring"
                >
                  {{ item.label }}
                </a>
              </UiSheetClose>
            </div>
            <div class="flex flex-col gap-2 border-t pt-4">
              <UiButton
                v-if="!isOperator"
                as-child
                variant="secondary"
              >
                <NuxtLink to="/auth?mode=sign-in&redirect=/operator">Log in</NuxtLink>
              </UiButton>
              <UiButton as-child>
                <NuxtLink :to="isOperator ? '/operator' : '/auth?mode=sign-up&redirect=/operator'">
                  {{ isOperator ? "Open inbox" : "Get started" }}
                </NuxtLink>
              </UiButton>
            </div>
          </nav>
        </UiSheetContent>
      </UiSheet>
    </div>
  </header>
</template>
