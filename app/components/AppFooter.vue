<script setup lang="ts">
import { ChevronDown, RadioTower, Star } from "lucide-vue-next";
import logo from "@/assets/images/logo-horizontal.svg";

const year = new Date().getUTCFullYear();
const navigation = [
  {
    label: "Product",
    links: [
      { label: "Testimonials", href: "https://crisp.chat/en/testimonials/", rating: true },
      { label: "Comparisons", href: "https://crisp.chat/en/comparisons/" },
      { label: "Alternatives", href: "https://crisp.chat/en/alternatives/" },
      { label: "Developer Hub", href: "https://docs.crisp.chat/" },
      { label: "Ask a demo", href: "https://crisp.chat/en/demo/" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "About us", href: "https://crisp.chat/en/about/" },
      { label: "Careers", href: "https://crisp.chat/en/careers/" },
      { label: "Brand Assets", href: "https://storage.crisp.chat/public/documents/brand%20assets.zip" },
      { label: "Partnerships", href: "https://crisp.chat/en/partnerships/" },
    ],
  },
  {
    label: "Resources",
    links: [
      { label: "Blog", href: "https://crisp.chat/en/blog/" },
      { label: "Help Center", href: "https://help.crisp.chat/en/" },
      { label: "Security", href: "https://docs.crisp.chat/guides/others/security-practices/" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Terms of Use", href: "https://crisp.chat/en/terms/" },
      { label: "Privacy", href: "https://crisp.chat/en/privacy/" },
    ],
  },
];

const languages = [
  { label: "English (United States)", flag: "🇺🇸", code: "en" },
  { label: "Français", flag: "🇫🇷", code: "fr" },
  { label: "Deutsch", flag: "🇩🇪", code: "de" },
  { label: "Español", flag: "🇪🇸", code: "es" },
  { label: "Português", flag: "🇵🇹", code: "pt" },
];

const socials = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/crispchat/",
    path: "M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.513c-1.491 0-1.956.931-1.956 1.887v2.263h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z",
  },
  {
    label: "X",
    href: "https://twitter.com/crisp_chat",
    path: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933ZM17.61 20.644h2.039L6.486 3.24H4.298L17.61 20.644Z",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@crisp_chat",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.017 3.017 0 0 0 2.121 2.136c1.872.505 9.377.505 9.377.505s7.505 0 9.376-.505a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z",
  },
  {
    label: "GitHub",
    href: "https://github.com/crisp-im",
    path: "M12 .297a12 12 0 0 0-3.793 23.385c.6.111.82-.261.82-.577v-2.234c-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.419-1.305.763-1.605-2.665-.303-5.467-1.334-5.467-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.323 3.301 1.23a11.52 11.52 0 0 1 6.006 0c2.291-1.553 3.297-1.23 3.297-1.23.655 1.652.243 2.873.119 3.176.769.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.625-5.479 5.922.43.372.823 1.102.823 2.222v3.293c0 .319.216.694.825.576A12 12 0 0 0 12 .297Z",
  },
];
</script>

<template>
  <footer class="border-t bg-background px-6 pt-14 pb-6 text-sm text-secondary-foreground lg:px-8">
    <div class="mx-auto max-w-7xl px-0 lg:px-8">
      <div class="grid gap-12 lg:grid-cols-3 lg:gap-8">
        <div class="flex flex-col items-start">
          <NuxtLink
            to="/"
            aria-label="Crisp home"
            class="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <span
              aria-hidden="true"
              :style="{ maskImage: `url(${logo})` }"
              class="block h-6 w-22 bg-secondary-foreground mask-contain mask-center mask-no-repeat"
            />
          </NuxtLink>

          <UiDropdownMenu>
            <UiDropdownMenuTrigger as-child>
              <button
                type="button"
                aria-label="Choose website language, current language: English (United States)"
                class="mt-8 flex w-64 max-w-full items-center gap-2 rounded-md border px-3 py-2 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span aria-hidden="true">🇺🇸</span>
                <span>English (United States)</span>
                <ChevronDown
                  aria-hidden="true"
                  class="ml-auto size-4"
                />
              </button>
            </UiDropdownMenuTrigger>
            <UiDropdownMenuContent
              align="start"
              side="top"
              class="w-64"
            >
              <UiDropdownMenuItem
                v-for="language in languages"
                :key="language.code"
                as-child
              >
                <a
                  :href="`https://crisp.chat/${language.code}/`"
                  :hreflang="language.code"
                  :lang="language.code"
                >
                  <span aria-hidden="true">{{ language.flag }}</span>
                  {{ language.label }}
                </a>
              </UiDropdownMenuItem>
            </UiDropdownMenuContent>
          </UiDropdownMenu>

          <nav
            aria-label="Social media"
            class="mt-6 flex items-center gap-5 text-muted-foreground"
          >
            <a
              v-for="social in socials"
              :key="social.label"
              :href="social.href"
              :aria-label="`Crisp on ${social.label}`"
              class="rounded-sm transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                class="size-5"
              >
                <path :d="social.path" />
              </svg>
            </a>
          </nav>
        </div>

        <nav
          aria-label="Footer navigation"
          class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-2"
        >
          <div
            v-for="group in navigation"
            :key="group.label"
          >
            <h2 class="mb-4 text-xs font-normal text-muted-foreground">
              {{ group.label }}
            </h2>
            <ul class="space-y-3">
              <li
                v-for="link in group.links"
                :key="link.label"
              >
                <a
                  :href="link.href"
                  class="inline-flex items-center gap-2 rounded-sm font-bold transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  {{ link.label }}
                  <span
                    v-if="link.rating"
                    aria-label="Rated 4.5 out of 5"
                    class="inline-flex items-center gap-1 text-amber-500"
                  >
                    4,5
                    <Star
                      aria-hidden="true"
                      class="size-4 fill-current"
                    />
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div class="mt-14 flex flex-col items-center gap-6 text-muted-foreground sm:flex-row sm:justify-between lg:mt-16">
        <a
          href="https://status.crisp.chat/"
          class="flex items-center gap-3 rounded-sm transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <RadioTower
            aria-hidden="true"
            class="size-7 text-secondary-foreground"
          />
          System Status
        </a>
        <p>© {{ year }} Crisp IM SAS</p>
        <p class="flex items-center gap-2">
          Made in France <span aria-hidden="true">🇫🇷</span>
        </p>
      </div>
    </div>
  </footer>
</template>
