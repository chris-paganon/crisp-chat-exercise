<script setup lang="ts">
import { ChevronRight, UsersRound } from "lucide-vue-next";
import translate from "@/assets/images/experiences/auto-translate.png";
import knowledge from "@/assets/images/experiences/knowledge-base.png";
import contacts from "@/assets/images/experiences/lucas-card.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  { title: "Auto-translate", image: translate, alt: "A German message automatically translated into English.", href: "https://crisp.chat/en/livechat/" },
  { title: "Knowledge Base", image: knowledge, alt: "Knowledge base answers, including how to modify personal data.", href: "https://crisp.chat/en/knowledge/" },
];
</script>

<template>
  <section
    aria-labelledby="experiences-title"
    class="px-6 pt-12 pb-16 lg:px-8 lg:pt-16 lg:pb-28"
  >
    <div class="mx-auto max-w-7xl">
      <div class="mb-12 text-center lg:mb-20">
        <Badge variant="outline">
          <UsersRound
            aria-hidden="true"
            class="size-5!"
          />
          Connect
        </Badge>
        <h2
          id="experiences-title"
          class="mx-auto mt-6 text-subtitle sm:text-title lg:text-5xl/14"
        >
          Unlock the power of<br class="hidden sm:block">
          conversational experiences
        </h2>
      </div>
      <div class="mx-auto grid max-w-300 gap-6 lg:grid-cols-[1fr_2fr] lg:gap-8">
        <Card class="gap-0 overflow-hidden pt-2 sm:pt-8 lg:row-span-2">
          <img
            :src="contacts"
            alt="Lucas Ordonéz’s contact profile with contact details and video and audio call options."
            width="384"
            height="332"
            loading="lazy"
            class="mx-auto h-auto w-full max-w-82 sm:max-w-96"
          >
          <CardHeader class="mt-4 gap-2 sm:mt-8 lg:mt-auto">
            <CardTitle>Contacts</CardTitle>
            <CardDescription>Lorem ipsum dolor sit amet consectetur.<br>Nec nunc arcu magna orci.</CardDescription>
          </CardHeader>
          <CardFooter class="mt-7">
            <Button
              as-child
              variant="link"
            >
              <a href="https://crisp.chat/en/crm/">Learn more <ChevronRight aria-hidden="true" /></a>
            </Button>
          </CardFooter>
        </Card>
        <Card
          v-for="feature in features"
          :key="feature.title"
          class="gap-0 overflow-hidden py-0 sm:grid sm:grid-cols-2 sm:items-center lg:h-64"
        >
          <div class="space-y-7 py-10">
            <CardHeader class="gap-2">
              <CardTitle>{{ feature.title }}</CardTitle>
              <CardDescription>Lorem ipsum dolor sit amet consectetur.<br>Nec nunc arcu magna orci.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                as-child
                variant="link"
              >
                <a
                  :href="feature.href"
                  :aria-label="`Learn more about ${feature.title}`"
                >Learn more <ChevronRight aria-hidden="true" /></a>
              </Button>
            </CardFooter>
          </div>
          <img
            :src="feature.image"
            :alt="feature.alt"
            loading="lazy"
            class="mx-auto h-auto w-full max-w-96"
          >
        </Card>
      </div>
    </div>
  </section>
</template>
