<script setup lang="ts">
import { Archive, Clock3, Gauge, UserRound } from "lucide-vue-next";
import featureBackground from "@/assets/images/get-to-know/bg-element-computer.png";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const features = [
  {
    id: "productivity",
    title: "More productivity",
    description: "All your channels and inbound messages in one unified inbox.",
    icon: Gauge,
  },
  // TODO: Replace AI Generated descriptions below
  {
    id: "customization",
    title: "More customization",
    description: "Adapt your shared inbox to the way your team works.",
    icon: Archive,
  },
  {
    id: "personalization",
    title: "More personalization",
    description: "Keep the context you need for every customer conversation.",
    icon: UserRound,
  },
  {
    id: "time",
    title: "More time",
    description: "Automate repetitive tasks so your team can spend more time helping customers.",
    icon: Clock3,
  },
];

const featureDuration = 6000;
const activeFeature = ref("productivity");
const currentIndex = computed(() => {
  return features.findIndex(feature => feature.id === activeFeature.value);
});

const progress = ref(0);
const featurePanel = useTemplateRef<HTMLDivElement>("featurePanel");
const isVisible = useElementVisibility(featurePanel);

// reset progress on click or from auto-progress below
watch(activeFeature, () => {
  progress.value = 0;
}, { flush: "sync" });

useRafFn(({ delta }) => {
  if (!isVisible.value) return;

  progress.value += Math.min(delta, 100) / featureDuration * 100;

  if (progress.value >= 100) {
    activeFeature.value = features[(currentIndex.value + 1) % features.length]!.id;
  }
});
</script>

<template>
  <section
    aria-labelledby="get-to-know-title"
    class="bg-background py-12 md:py-16 lg:pt-24 lg:pb-28"
  >
    <div class="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2 md:gap-16 lg:flex lg:justify-between lg:px-8">
      <div
        ref="featurePanel"
        class="lg:w-114 lg:shrink-0 lg:pt-6"
      >
        <h2
          id="get-to-know-title"
          class="mb-10 text-title lg:mb-12 lg:text-5xl/14"
        >
          Let's get to know<br>each other
        </h2>

        <Accordion
          v-model="activeFeature"
          type="single"
          class="space-y-2"
        >
          <AccordionItem
            v-for="feature in features"
            :key="feature.id"
            :value="feature.id"
            variant="feature"
            class="group relative isolate overflow-hidden"
          >
            <img
              :src="featureBackground"
              alt=""
              aria-hidden="true"
              width="195"
              height="149"
              class="pointer-events-none absolute top-1 right-1 -z-10 h-auto w-49 opacity-0 group-data-[state=open]:opacity-100"
            >
            <AccordionTrigger
              class="gap-0 py-6 text-lg data-[state=open]:pb-2 lg:text-xl"
              @click="progress = 0"
            >
              <span class="flex items-center gap-4">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-sm bg-linear-to-b from-background to-border text-muted-foreground group-data-[state=open]:from-background group-data-[state=open]:to-primary/15 group-data-[state=open]:text-primary">
                  <component
                    :is="feature.icon"
                    aria-hidden="true"
                    class="size-5 stroke-1"
                  />
                </span>
                {{ feature.title }}
              </span>
              <template #icon>
                <span aria-hidden="true" />
              </template>
            </AccordionTrigger>
            <AccordionContent class="pb-6 pl-11 text-base/7 lg:text-lg/7">
              <p>{{ feature.description }}</p>
              <div
                aria-hidden="true"
                class="mt-4 h-0.75 overflow-hidden rounded-full bg-border"
              >
                <div
                  class="size-full origin-left bg-primary"
                  :style="{ transform: `scaleX(${progress / 100})` }"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <HomeInboxConversation class="mx-auto hidden self-center md:block lg:mx-0 lg:w-148" />
    </div>
  </section>
</template>
