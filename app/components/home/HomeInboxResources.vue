<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";
import illustration from "@/assets/images/shared-inbox/what-is-shared-inbox.png";
import { Button } from "@/components/ui/button";
import { channelIcons } from "@/lib/channels";

const competitors = ["front", "hiver", "zendesk", "intercom"];
</script>

<template>
  <section
    aria-label="About shared inbox software"
    class="px-6 lg:px-8"
  >
    <div class="mx-auto max-w-7xl space-y-4">
      <div class="from-surface-green/10 grid items-center gap-10 rounded-2xl bg-linear-to-b to-[#76B054]/10 px-6 py-12 sm:rounded-3xl sm:px-10 md:grid-cols-2 lg:gap-24 lg:px-12 lg:py-16">
        <img
          :src="illustration"
          alt="A shared inbox brings messaging channels, customer details, and team conversations together."
          loading="lazy"
          class="mx-auto h-auto w-full max-w-140 mask-b-from-90% mask-b-to-100%"
        >
        <div class="text-chart-3 lg:pr-10">
          <h2 class="text-subtitle sm:text-3xl/9">
            What is a <span class="text-chart-2">shared inbox</span> software ?
          </h2>
          <p class="mt-4 text-lg/7">
            Lorem ipsum dolor sit amet consectetur. Sed sed lacus imperdiet eget neque aliquam malesuada sed. Accumsan nunc id lacus sit odio felis non.
          </p>
          <p class="mt-6 text-lg/7">
            Quam blandit magna sed suspendisse neque odio commodo. Hac maecenas cursus gravida consequat leo. Integer commodo quis morbi neque eu iaculis ut odio neque. Commodo cras massa erat nulla sodales cras. Sed ut mi commodo bibendum quam urna amet hac. Rhoncus lacus ac viverra ut placerat non nibh pharetra nisi. Sit id turpis sagittis leo et tincidunt eget.
          </p>
        </div>
      </div>
      <div class="grid items-center gap-12 rounded-2xl bg-linear-to-b from-muted to-primary/10 px-6 py-12 sm:rounded-3xl sm:px-10 md:grid-cols-2 lg:gap-24 lg:px-20 lg:py-16">
        <div>
          <h2 class="text-subtitle text-blue-900 sm:text-3xl/9">
            Compare the best shared inbox<br class="hidden lg:block"> solutions in 2023
          </h2>
          <p class="mt-6 text-lg/7 text-muted-foreground">
            Looking for the best team inbox for your company? Willing to compare shared inbox market leaders ?
          </p>
          <p class="mt-5 text-lg/7 text-muted-foreground">
            Here is your chance! To strengthen and accelerate your path to choose your next shared inbox, we've taken the time to compare 10+ vendors through more than 50 different criterias.
          </p>
          <Button
            as-child
            variant="link"
            class="mt-8"
          >
            <a href="https://crisp.chat/en/alternatives/">See more shared inboxes compared <ChevronRight aria-hidden="true" /></a>
          </Button>
        </div>
        <div class="mx-auto grid w-full max-w-108 gap-5 sm:grid-cols-2">
          <a
            v-for="(competitor, index) in competitors"
            :key="competitor"
            :href="`https://crisp.chat/en/alternatives/${competitor}/`"
            :aria-label="`Compare Crisp with ${competitor}`"
            class="flex flex-col items-center gap-8 rounded-sm bg-background px-4 py-10 text-secondary-foreground transition-shadow hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <img
              :src="channelIcons.whatsapp"
              alt=""
              loading="lazy"
              class="size-14"
            >
            <span class="flex items-center gap-1 text-base">Competitor {{ index + 1 }} <ChevronRight
              aria-hidden="true"
              class="size-4"
            /></span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
