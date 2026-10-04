<script setup lang="ts">
import { ChevronRight, CodeSquare, MessageCircle } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { channelIcons } from "@/lib/channels";

const channels = [
  { name: "Whatsapp Business", icon: channelIcons.whatsapp, slug: "whatsapp" },
  { name: "Shared Email Inbox", icon: channelIcons.email, slug: "email", href: "https://help.crisp.chat/en/article/how-to-receive-emails-in-crisp-wp7jug/" },
  { name: "Telegram", icon: channelIcons.telegram, slug: "telegram" },
  { name: "Line Business", icon: channelIcons.line, slug: "line" },
  { name: "Viber Business", icon: channelIcons.viber, slug: "viber" },
  { name: "Facebook Messenger", icon: channelIcons.messenger, slug: "messenger" },
  { name: "Instagram DM", icon: channelIcons.instagram, slug: "instagram" },
  { name: "Chat Widget", slug: "livechat" },
  { name: "SMS Inbox", icon: channelIcons.sms, slug: "twilio" },
];
</script>

<template>
  <section
    aria-labelledby="specific-needs-title"
    class="px-6 pt-12 pb-4 lg:px-8 lg:pt-16"
  >
    <div class="mx-auto max-w-7xl">
      <div class="mb-10 text-center sm:mb-12 lg:mb-16">
        <Badge variant="outline">
          <CodeSquare
            aria-hidden="true"
            class="size-5!"
          />Automate
        </Badge>
        <h2
          id="specific-needs-title"
          class="mt-6 text-subtitle sm:text-title lg:text-5xl/14"
        >
          Built to adapt to your<br class="hidden sm:block"> specific needs
        </h2>
        <div
          aria-hidden="true"
          class="mx-auto mt-8 flex max-w-96 items-center gap-3 text-border sm:mt-12"
        >
          <span class="h-px flex-1 bg-linear-to-r from-transparent to-border" />
          <span class="h-4 w-px bg-border" />
          <span class="size-3 rounded-full border" />
          <span class="h-4 w-px bg-border" />
          <span class="h-px flex-1 bg-linear-to-l from-transparent to-border" />
        </div>
      </div>
      <div class="sky-gradient grid items-center gap-8 rounded-2xl px-6 py-8 sm:gap-12 sm:rounded-3xl sm:p-12 lg:grid-cols-2 lg:gap-24 lg:p-20">
        <HomeTemplatedConversation />
        <div>
          <h3 class="text-subtitle text-primary sm:text-3xl/9">
            <span>Templated messages</span><span class="text-blue-900"> available for all your inbound messages, no matter the channel.</span>
          </h3>
          <p class="mt-5 text-lg/7 text-blue-900">
            Here are (almost) all the templates you can create using our team inbox
          </p>
          <div class="mt-8 grid gap-2 sm:mt-10 sm:grid-cols-2">
            <Button
              v-for="channel in channels"
              :key="channel.name"
              as-child
              variant="secondary"
              class="h-12 justify-start rounded-sm px-3 font-normal"
            >
              <a :href="channel.href ?? (channel.slug === 'livechat' ? 'https://crisp.chat/en/livechat/' : `https://crisp.chat/en/integrations/${channel.slug}/`)">
                <img
                  v-if="channel.icon"
                  :src="channel.icon"
                  alt=""
                  class="size-5"
                >
                <MessageCircle
                  v-else
                  aria-hidden="true"
                  class="size-5 fill-primary text-primary-foreground"
                />
                {{ channel.name }}
                <ChevronRight
                  aria-hidden="true"
                  class="ml-auto text-muted-foreground"
                />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
