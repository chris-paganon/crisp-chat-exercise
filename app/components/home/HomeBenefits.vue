<script setup lang="ts">
import calendar from "@/assets/images/benefits/calendar-love.png";
import devices from "@/assets/images/benefits/devices.png";
import lock from "@/assets/images/benefits/lock.png";

const benefits = [
  {
    title: "Enterprise level-grade security",
    description: "Get a complete picture of every customer or lead, including their location, activity, and more.",
    icon: lock,
  },
  {
    title: "Up to 30 days free trial",
    description: "Filter and target customers by the actions they do or don’t take in your app.",
    icon: calendar,
  },
  {
    title: "Built for mobile and desktop",
    description: "Build a data-driven strategy thanks to our universal inbox.",
    icon: devices,
  },
];
</script>

<template>
  <section
    aria-labelledby="benefits-title"
    class="px-6 py-16 lg:px-8 lg:py-40"
  >
    <div class="mx-auto max-w-7xl text-center">
      <h2
        id="benefits-title"
        class="text-subtitle sm:text-3xl/9"
      >
        Significant things you<br>wouldn’t want to miss
      </h2>
      <div class="mt-14 grid gap-12 md:grid-cols-3 md:gap-0">
        <div
          v-for="(benefit, index) in benefits"
          :key="benefit.title"
          class="relative px-6 md:px-10 md:not-last:after:absolute md:not-last:after:top-0 md:not-last:after:right-0 md:not-last:after:h-40 md:not-last:after:w-px md:not-last:after:bg-linear-to-b md:not-last:after:from-background md:not-last:after:via-border md:not-last:after:to-background"
        >
          <span
            v-if="index < benefits.length - 1"
            aria-hidden="true"
            class="absolute top-20 -right-2 hidden size-4 items-center justify-center text-border md:flex"
          >+</span>
          <img
            :src="benefit.icon"
            alt=""
            width="32"
            height="32"
            loading="lazy"
            class="mx-auto mb-7 size-8"
          >
          <h3 class="text-xl">
            {{ benefit.title }}
          </h3>
          <p class="mx-auto mt-2 max-w-80 text-base/6 text-muted-foreground">
            {{ benefit.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
