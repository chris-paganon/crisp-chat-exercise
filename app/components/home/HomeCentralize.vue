<script setup lang="ts">
import { ChevronRight, Layers, Plus } from "lucide-vue-next";
import sparkleLeft from "@/assets/images/customers/sparkle-left.png";
import sparkleRight from "@/assets/images/customers/sparkle-right.png";
import crispLogoRound from "@/assets/images/logo-round.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { channelIcons } from "@/lib/channels";

const channels = [
  { name: "Whatsapp Business", icon: channelIcons.whatsapp, href: "https://crisp.chat/en/integrations/whatsapp/" },
  { name: "Shared Email Inbox", icon: channelIcons.email, href: "https://help.crisp.chat/en/article/how-to-receive-emails-in-crisp-wp7jug/" },
  { name: "Telegram", icon: channelIcons.telegram, href: "https://crisp.chat/en/integrations/telegram/" },
  { name: "Line Business", icon: channelIcons.line, href: "https://crisp.chat/en/integrations/line/" },
  { name: "Viber Business", icon: channelIcons.viber, href: "https://crisp.chat/en/integrations/viber/" },
  { name: "Facebook Messenger", icon: channelIcons.messenger, href: "https://crisp.chat/en/integrations/messenger/" },
  { name: "Instagram DM", icon: channelIcons.instagram, href: "https://crisp.chat/en/integrations/instagram/" },
  { name: "Chat Widget", icon: crispLogoRound, href: "https://crisp.chat/en/livechat/" },
  { name: "SMS Inbox", icon: channelIcons.sms, href: "https://crisp.chat/en/integrations/twilio/" },
];
</script>

<template>
  <section
    aria-labelledby="centralize-title"
    class="bg-background px-6 pt-10 pb-12 md:pb-16 lg:px-8 lg:pt-12 lg:pb-28"
  >
    <div class="mx-auto max-w-7xl">
      <div class="relative mb-10 text-center md:mb-16">
        <img
          :src="sparkleLeft"
          alt=""
          aria-hidden="true"
          width="234"
          height="234"
          loading="lazy"
          class="pointer-events-none absolute top-0 left-0 hidden size-60 md:block"
        >
        <img
          :src="sparkleRight"
          alt=""
          aria-hidden="true"
          width="234"
          height="234"
          loading="lazy"
          class="pointer-events-none absolute top-0 right-0 hidden size-60 md:block"
        >

        <Badge variant="outline">
          <Layers
            aria-hidden="true"
            class="size-5!"
          />
          Centralize
        </Badge>
        <h2
          id="centralize-title"
          class="relative mx-auto mt-6 max-w-200 text-subtitle sm:text-title lg:text-5xl/14"
        >
          Made to change the way you handle<br class="hidden lg:block">
          your customer’s communications
        </h2>
        <div
          aria-hidden="true"
          class="mx-auto mt-8 flex max-w-100 items-center justify-center gap-1.5 text-border md:mt-12"
        >
          <span class="h-px flex-1 bg-linear-to-r from-transparent to-border" />
          <Plus class="size-4 stroke-1" />
          <span class="size-3 rounded-full border" />
          <Plus class="size-4 stroke-1" />
          <span class="h-px flex-1 bg-linear-to-l from-transparent to-border" />
        </div>
      </div>

      <div class="from-surface-green/10 grid items-center gap-12 overflow-hidden rounded-2xl bg-linear-to-b to-[#76B054]/10 px-6 py-12 sm:rounded-3xl sm:px-10 lg:grid-cols-2 lg:p-12 xl:gap-20 xl:p-20">
        <div class="text-chart-3">
          <h3 class="text-lead sm:text-subtitle lg:text-3xl/9">
            <span class="text-chart-2">A shared inbox</span> for all your inbound messages, no matter the channel.
          </h3>
          <p class="mt-4 text-base/7 lg:text-lg/7">
            Here are (almost) all the channels available to be centralized in Crisp shared inbox software
          </p>

          <ul class="mt-8 grid gap-2 sm:grid-cols-2 lg:mt-10">
            <li
              v-for="channel in channels"
              :key="channel.name"
              class="min-w-0"
            >
              <Button
                as-child
                variant="outline"
                class="h-12 w-full justify-start gap-2 rounded-sm border-chart-3/10 bg-background px-3 text-sm font-normal sm:text-base xl:gap-3 xl:px-4"
              >
                <a :href="channel.href">
                  <img
                    :src="channel.icon"
                    alt=""
                    class="size-4 shrink-0 object-contain sm:size-5"
                    :class="{ 'scale-150': channel.icon === crispLogoRound }"
                  >
                  <span class="min-w-0 text-left whitespace-normal">{{ channel.name }}</span>
                  <ChevronRight
                    aria-hidden="true"
                    class="ml-auto size-4 shrink-0 stroke-1 text-muted-foreground"
                  />
                </a>
              </Button>
            </li>
          </ul>
        </div>

        <HomeInboxIllustration class="lg:justify-self-end" />
      </div>
    </div>
  </section>
</template>
