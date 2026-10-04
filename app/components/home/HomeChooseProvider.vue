<script setup lang="ts">
import { EyeOff, Network, PiggyBank, Sparkles, TrendingUp, Zap } from "lucide-vue-next";
import illustration from "@/assets/images/shared-inbox/how-to-choose-shared-inbox.png";

const factors = [
  { title: "Omnichannel", description: "Customer communication is not only about shared email inbox anymore", icon: Sparkles },
  { title: "Performance", description: "Customer communication should drive insightful data through dedicated analytics", icon: Zap },
  { title: "No-code", description: "Everyone in the company should be able to get started", icon: EyeOff },
  { title: "Scalable", description: "Automated workflows should make your teams more productive", icon: TrendingUp },
  { title: "Affordable", description: "Customer communication should be cost-efficient", icon: PiggyBank },
  { title: "Integrated", description: "Your tools should be easily connected to your shared inbox", icon: Network },
];
</script>

<template>
  <section
    aria-labelledby="choose-provider-title"
    class="px-6 py-16 lg:px-8 lg:py-40"
  >
    <div class="mx-auto max-w-6xl">
      <div class="text-center">
        <h2
          id="choose-provider-title"
          class="text-title lg:text-5xl/14"
        >
          How to choose your next<br class="hidden sm:block"> shared inbox provider
        </h2>
        <p class="mx-auto mt-6 max-w-160 text-lg/7 text-muted-foreground">
          With the explosion of communications' channels, companies have to make sure they choose the right shared inbox software for their company. To help businesses in the process, we've gathered 6 key factors.
        </p>
        <div class="relative mx-auto mt-10 aspect-5/3 w-full max-w-160 overflow-hidden">
          <img
            :src="illustration"
            alt="Messaging channels including Messenger, Instagram, Gmail, and WhatsApp surround Crisp's shared inbox."
            loading="lazy"
            class="absolute top-1/2 left-1/2 h-auto w-full -translate-1/2"
          >
        </div>
        <h3 class="mt-12 text-subtitle sm:text-3xl/9">
          Make sure your next provider<br class="hidden sm:block"> checks these boxes!
        </h3>
        <p class="mx-auto mt-5 max-w-108 text-base/6 text-muted-foreground">
          These 6 assets are here to help companies navigate the competitive landscape of collaborative inboxes.
        </p>
      </div>
      <div class="mt-16 grid gap-y-12 md:grid-cols-3 lg:mt-24 lg:gap-y-16">
        <div
          v-for="(factor, index) in factors"
          :key="factor.title"
          class="relative px-6 md:px-10 md:not-nth-[3n]:after:absolute md:not-nth-[3n]:after:inset-y-0 md:not-nth-[3n]:after:right-0 md:not-nth-[3n]:after:w-px md:not-nth-[3n]:after:bg-linear-to-b md:not-nth-[3n]:after:from-background md:not-nth-[3n]:after:via-border md:not-nth-[3n]:after:to-background"
        >
          <span
            v-if="index % 3 !== 2"
            aria-hidden="true"
            class="absolute top-16 -right-2 hidden size-4 items-center justify-center text-border md:flex"
          >+</span>
          <component
            :is="factor.icon"
            aria-hidden="true"
            class="mb-7 size-7 stroke-1 text-muted-foreground"
          />
          <h4 class="text-xl">
            {{ factor.title }}
          </h4>
          <p class="mt-2 text-base/6 text-muted-foreground">
            {{ factor.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
