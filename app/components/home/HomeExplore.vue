<script setup lang="ts">
import centralisation from "@/assets/images/explore/explore-centralisation.png";
import decorativeElements from "@/assets/images/explore/explore-decorative-elements.png";
import inboxScreen from "@/assets/images/explore/explore-screen.png";
</script>

<template>
  <section
    aria-labelledby="explore-title"
    class="bg-background px-6 pb-12 md:pb-16 lg:px-8 lg:pb-28"
  >
    <div class="orange-gradient relative isolate mx-auto max-w-7xl overflow-hidden rounded-2xl to-[#FF9100]/10 px-4 pt-40 pb-6 sm:rounded-3xl sm:px-10 sm:pt-56 sm:pb-10 lg:px-22 lg:pt-72 lg:pb-12">
      <img
        :src="decorativeElements"
        alt=""
        aria-hidden="true"
        width="1279"
        height="838"
        loading="lazy"
        class="pointer-events-none absolute inset-x-0 top-0 -z-10 w-full"
      >
      <img
        :src="centralisation"
        alt=""
        aria-hidden="true"
        width="794"
        height="367"
        loading="lazy"
        class="pointer-events-none absolute top-4 left-1/2 -z-10 w-full max-w-200 -translate-x-1/2 sm:top-6 lg:top-10"
      >

      <h2
        id="explore-title"
        class="text-center text-subtitle text-chart-4 sm:text-title lg:text-6xl/16"
      >
        Explore our shared<br>inbox software
      </h2>

      <div class="relative isolate mx-auto mt-8 w-full max-w-274 sm:mt-10 lg:mt-14">
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-x-1/25 bottom-1/40 -z-10 h-1/10 rounded-xl border border-destructive/15 bg-background/30 shadow-md shadow-destructive/10"
        />
        <img
          :src="inboxScreen"
          alt="Crisp's shared inbox with customer conversations, a support reply, and customer details in one workspace."
          width="1094"
          height="707"
          loading="lazy"
          class="h-auto w-full"
        >
      </div>
    </div>
  </section>
</template>
