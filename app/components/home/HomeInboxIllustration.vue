<script setup lang="ts">
import { ArrowRight, Check } from "lucide-vue-next";
import agent1 from "@/assets/images/customers/customer-service-agent-1.jpg";
import agent2 from "@/assets/images/customers/customer-service-agent-2.jpg";
import agent3 from "@/assets/images/customers/customer-service-agent-3.jpg";
import agent4 from "@/assets/images/customers/customer-service-agent-4.jpg";
import agent5 from "@/assets/images/customers/customer-service-agent-5.jpg";
import agent6 from "@/assets/images/customers/customer-service-agent-6.jpg";
import kristin from "@/assets/images/customers/kristin.png";
import ronald from "@/assets/images/customers/ronald.png";
import theresa from "@/assets/images/customers/theresa.png";
import franceFlag from "@/assets/images/flags/france.svg";
import indonesiaFlag from "@/assets/images/flags/indonesia.svg";
import italyFlag from "@/assets/images/flags/italy.svg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { channelIcons } from "@/lib/channels";

const conversations = [
  {
    name: "Kristin Watson",
    initials: "KW",
    portrait: kristin,
    message: "Hi, I received an email about...",
    flag: franceFlag,
    agents: [agent1, agent2, agent3],
    status: "assigned",
    statusClass: "bg-rose-600",
  },
  {
    name: "Theresa Webb",
    initials: "TW",
    portrait: theresa,
    message: "Hello, I'm having trouble using a feature...",
    flag: indonesiaFlag,
    agents: [agent4],
    status: "unread",
    statusClass: "bg-blue-500",
  },
  {
    name: "Ronald Richards",
    initials: "RR",
    portrait: ronald,
    message: "Hi there, I'm having trouble logging in...",
    flag: italyFlag,
    agents: [agent6, agent5],
    status: "resolved",
    statusClass: "bg-emerald-500",
  },
];

const channels = [
  { name: "Telegram", icon: channelIcons.telegram },
  { name: "WhatsApp", icon: channelIcons.whatsapp },
  { name: "Gmail", icon: channelIcons.gmail },
  { name: "Instagram", icon: channelIcons.instagram },
  { name: "Messenger", icon: channelIcons.messenger },
];
</script>

<template>
  <div
    role="img"
    aria-label="Telegram, WhatsApp, Gmail, Instagram, and Messenger conversations come together in one shared inbox, with assigned teammates and conversation statuses."
    class="@container relative isolate mx-auto w-full max-w-md"
  >
    <div aria-hidden="true">
      <div class="absolute inset-x-0 top-0 bottom-10 -z-10 flex justify-center @sm:bottom-14">
        <div class="w-px bg-chart-3/30" />
      </div>

      <div class="space-y-5 @sm:space-y-6">
        <div
          v-for="conversation in conversations"
          :key="conversation.name"
          class="flex items-center gap-2 rounded-lg bg-background p-3 shadow-inbox @sm:gap-3 @sm:p-4.5"
        >
          <div class="relative shrink-0">
            <Avatar class="size-10 @sm:size-12">
              <AvatarImage
                :src="conversation.portrait"
                alt=""
                loading="lazy"
                class="object-cover"
              />
              <AvatarFallback>{{ conversation.initials }}</AvatarFallback>
            </Avatar>
            <img
              :src="conversation.flag"
              alt=""
              class="absolute -right-0.5 -bottom-0.5 size-4 rounded-full border-2 border-background @sm:size-5"
            >
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm/5 font-medium @sm:text-lg/6">
              {{ conversation.name }}
            </p>
            <p class="mt-0.5 truncate text-xs/5 text-secondary-foreground/60 @sm:text-base/5">
              {{ conversation.message }}
            </p>
          </div>

          <div class="flex shrink-0 -space-x-2">
            <Avatar
              v-for="(agent, index) in conversation.agents"
              :key="agent"
              class="size-6 border-2 border-background @sm:size-8"
            >
              <AvatarImage
                :src="agent"
                alt=""
                loading="lazy"
                class="object-cover"
              />
              <AvatarFallback>{{ index + 1 }}</AvatarFallback>
            </Avatar>
          </div>
          <span
            class="ml-1 flex size-5 shrink-0 items-center justify-center rounded-xs text-background @sm:ml-2 @sm:size-6"
            :class="conversation.statusClass"
          >
            <ArrowRight
              v-if="conversation.status === 'assigned'"
              class="size-4 stroke-3"
            />
            <Check
              v-else-if="conversation.status === 'resolved'"
              class="size-4 rounded-full bg-background/10 stroke-3"
            />
            <span
              v-else
              class="text-sm font-medium @sm:text-base"
            >2</span>
          </span>
        </div>
      </div>

      <div class="relative mx-auto mt-20 grid w-5/6 grid-cols-5 @sm:mt-28">
        <svg
          viewBox="0 0 500 40"
          fill="none"
          preserveAspectRatio="none"
          class="absolute -top-6 left-1/2 -z-10 h-8 w-4/5 -translate-x-1/2 stroke-chart-3/30"
        >
          <path d="M250 0v10q0 10-10 10H10Q0 20 0 30v10M250 0v10q0 10 10 10h230q10 0 10 10v10M125 40V30q0-10 10-10M250 0v40M375 40V30q0-10-10-10" />
        </svg>
        <div
          v-for="channel in channels"
          :key="channel.name"
          class="flex aspect-square w-4/5 items-center justify-center justify-self-center rounded-full border border-border bg-linear-to-b from-background to-muted shadow-sm"
        >
          <img
            :src="channel.icon"
            alt=""
            class="size-3/5 object-contain"
          >
        </div>
      </div>
    </div>
  </div>
</template>
