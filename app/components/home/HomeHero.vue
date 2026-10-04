<script setup lang="ts">
import heroBackground from "@/assets/images/hero/hero-bg.png";
import heroComposition from "@/assets/images/hero/hero-featured-composition.png";
import heroInterface from "@/assets/images/hero/hero-ui-elements.svg";
</script>

<template>
  <section
    aria-labelledby="hero-title"
    class="relative isolate overflow-hidden bg-background pt-30 pb-12 lg:pt-35 lg:pb-20"
  >
    <img
      :src="heroBackground"
      alt=""
      aria-hidden="true"
      width="1440"
      height="899"
      fetchpriority="high"
      class="pointer-events-none absolute top-0 left-1/2 -z-10 w-full max-w-none min-w-360 -translate-x-1/2"
    >

    <div class="relative z-10 mx-auto max-w-5xl px-6 text-center">
      <h1
        id="hero-title"
        class="bg-linear-to-b from-foreground/80 to-foreground bg-clip-text text-title text-transparent md:text-display lg:text-6xl/16"
      >
        A shared inbox to bring seamless collaboration in one place
      </h1>
      <p class="mx-auto mt-6 max-w-200 text-lg font-medium text-secondary-foreground md:text-lead">
        Collaborate effortlessly inside one shared inbox, centralize conversations from multiple
        channels, and improve first response times thanks to dedicated features.
      </p>

      <div class="mt-8 flex flex-wrap justify-center gap-3 lg:mt-10">
        <UiButton
          as-child
          size="lg"
        >
          <a href="https://crisp.chat/en/shared-inbox/">Take a tour</a>
        </UiButton>
        <UiButton
          as-child
          variant="secondary"
          size="lg"
        >
          <a href="https://app.crisp.chat/initiate/signup/">Get started</a>
        </UiButton>
      </div>
      <p class="mt-2 text-sm text-secondary-foreground">
        14 days free trial — no commitment
      </p>
    </div>

    <!-- Keep both illustration layers on the same canvas as they scale. -->
    <div
      aria-hidden="true"
      class="pointer-events-none px-6"
    >
      <div
        class="relative left-1/2 mt-1 aspect-48/25 w-full max-w-310 min-w-160 -translate-x-1/2  md:min-w-0 lg:ml-6"
      >
        <img
          :src="heroInterface"
          alt=""
          width="923"
          height="393"
          class="hero-interface absolute top-0 left-1/2 w-3/4 -translate-x-1/2"
        >
        <img
          :src="heroComposition"
          alt=""
          width="1243"
          height="459"
          class="hero-composition absolute inset-x-0 bottom-0 w-full"
        >
      </div>
    </div>
  </section>
</template>

<style scoped>
/* One entrance per page load; scrolling and hovering never restart it. */
@media (prefers-reduced-motion: no-preference) {
  .hero-composition {
    transform-origin: center bottom;
    animation: hero-rise 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.15s 1 both;
  }

  .hero-interface {
    transform-origin: center bottom;
    animation: hero-settle 1.3s cubic-bezier(0.22, 1, 0.36, 1) 0.35s 1 both;
  }
}

@keyframes hero-rise {
  from {
    opacity: 0;
    transform: translateY(calc(var(--spacing) * 12)) scale(0.94) rotate(-2deg);
  }
  65% {
    opacity: 1;
    transform: translateY(calc(var(--spacing) * -1)) scale(1.01) rotate(0.3deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes hero-settle {
  from {
    opacity: 0;
    transform: translateY(calc(var(--spacing) * -8)) scale(0.9) rotate(2deg);
  }
  65% {
    opacity: 1;
    transform: translateY(var(--spacing)) scale(1.015) rotate(-0.4deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
