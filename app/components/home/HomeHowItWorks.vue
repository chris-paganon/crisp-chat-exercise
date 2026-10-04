<script setup lang="ts">
import answer from "@/assets/images/how-it-works/answer.png";
import connect from "@/assets/images/how-it-works/connect.png";
import invite from "@/assets/images/how-it-works/invite.png";

const steps = [
  { title: "Connect your channel", image: connect },
  { title: "Invite your operators", image: invite },
  { title: "Answer customers on any channels", image: answer },
];
</script>

<template>
  <section
    aria-labelledby="how-it-works-title"
    class="px-6 pt-16 pb-24 lg:px-8 lg:pt-20 lg:pb-40"
  >
    <div class="mx-auto max-w-304 text-center">
      <h2
        id="how-it-works-title"
        class="text-title lg:text-5xl/14"
      >
        How does it work ?
      </h2>
      <ol class="mt-12 grid gap-12 md:grid-cols-3 md:gap-8 lg:mt-16">
        <li
          v-for="(step, index) in steps"
          :key="step.title"
          class="mx-auto w-full max-w-96"
        >
          <img
            :src="step.image"
            alt=""
            width="384"
            height="326"
            loading="lazy"
            class="w-full rounded-2xl"
          >
          <span class="relative mx-auto -mt-10 flex size-20 items-center justify-center rounded-full border border-border bg-card text-2xl text-muted-foreground shadow-xs">
            {{ index + 1 }}
          </span>
          <h3
            class="mx-auto mt-5 max-w-68 text-2xl/8 lg:text-3xl/9"
          >
            {{ step.title }}
          </h3>
        </li>
      </ol>
    </div>
  </section>
</template>
