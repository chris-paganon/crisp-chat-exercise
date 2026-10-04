<script setup lang="ts">
import { Quote, Star } from "lucide-vue-next";
import airFrancePhoto from "@/assets/images/testimonials/air-france.jpg";
import airFranceLogo from "@/assets/images/testimonials/air-france.svg";
import g2Logo from "@/assets/images/testimonials/g2.svg";
import rakutenPhoto from "@/assets/images/testimonials/rakuten.jpg";
import rakutenLogo from "@/assets/images/testimonials/rakuten.svg";
import avatar from "@/assets/images/testimonials/renault-tom-johnson.jpg";
import schneiderPhoto from "@/assets/images/testimonials/schneider.jpg";
import schneiderLogo from "@/assets/images/testimonials/schneider.svg";
import { Button } from "@/components/ui/button";

type Testimonial = { type: "photo"; company: string; photo: string; logo: string; aspect: string } | { type: "person" | "review" | "quote"; text: string };
const shortQuote = "Offer a proactive customer support strategy to onboard customer with in-context, multichannel, automated messages.";
const columns: Testimonial[][] = [
  [
    { type: "photo", company: "Rakuten", photo: rakutenPhoto, logo: rakutenLogo, aspect: "aspect-square" },
    { type: "review", text: "Offer a proactive customer support strategy to onboard customer with in-context." },
    { type: "person", text: shortQuote },
  ],
  [
    { type: "person", text: shortQuote },
    { type: "quote", text: shortQuote },
    { type: "photo", company: "Schneider", photo: schneiderPhoto, logo: schneiderLogo, aspect: "aspect-square" },
  ],
  [
    { type: "review", text: shortQuote },
    { type: "photo", company: "Airfrance", photo: airFrancePhoto, logo: airFranceLogo, aspect: "aspect-6/5" },
    { type: "person", text: shortQuote },
  ],
];
</script>

<template>
  <section
    aria-labelledby="testimonials-title"
    class="px-6 py-16 lg:px-8 lg:py-24"
  >
    <div class="mx-auto max-w-7xl">
      <div class="text-center">
        <h2
          id="testimonials-title"
          class="text-title lg:text-5xl/14"
        >
          See their testimonials and reviews<br class="hidden sm:block"> about our Shared Inbox software
        </h2>
        <Button
          as-child
          variant="outline"
          class="mt-6"
        >
          <a href="https://crisp.chat/en/testimonials/">See their testimonials</a>
        </Button>
      </div>
      <div class="mx-auto mt-14 grid max-w-6xl gap-8 md:grid-cols-3">
        <div
          v-for="(column, index) in columns"
          :key="index"
          class="flex flex-col gap-8"
        >
          <template
            v-for="(card, cardIndex) in column"
            :key="cardIndex"
          >
            <a
              v-if="card.type === 'photo'"
              href="https://crisp.chat/en/testimonials/"
              :aria-label="`Read the ${card.company} testimonial`"
              :class="['group relative block shrink-0 overflow-hidden rounded-md', card.aspect]"
            >
              <img
                :src="card.photo"
                :alt="`${card.company} customer sharing their experience with Crisp`"
                loading="lazy"
                class="size-full object-cover transition-transform group-hover:scale-105 motion-reduce:transition-none"
              >
              <div class="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-foreground to-transparent px-4 pt-12 pb-4 text-sm text-primary-foreground">
                <span class="flex size-8 items-center justify-center rounded-sm bg-background p-1.5"><img
                  :src="card.logo"
                  alt=""
                  class="size-full"
                ></span>
                {{ card.company }}
              </div>
            </a>
            <figure
              v-else
              :class="['rounded-md border border-border p-6', card.type === 'quote' ? 'bg-card text-center' : 'bg-background', card.type === 'person' ? 'shrink-0' : 'md:flex-1', index === 0 && cardIndex === 1 ? 'max-md:-order-1' : '']"
            >
              <figcaption
                v-if="card.type === 'person'"
                class="mb-6 flex items-center gap-3 text-sm"
              >
                <img
                  :src="avatar"
                  alt=""
                  loading="lazy"
                  class="size-12 rounded-full object-cover"
                >
                <div>Tom Johnson<span class="mt-1 block text-xs text-muted-foreground">CEO @ Renault</span></div>
              </figcaption>
              <div
                v-else-if="card.type === 'review'"
                class="mb-8 flex items-center gap-3"
              >
                <img
                  :src="g2Logo"
                  alt="G2"
                  class="size-12"
                >
                <span
                  aria-label="5 out of 5 stars"
                  class="flex gap-1 text-destructive"
                ><Star
                  v-for="star in 5"
                  :key="star"
                  aria-hidden="true"
                  class="size-6 fill-current stroke-0"
                /></span>
              </div>
              <Quote
                v-else
                aria-hidden="true"
                class="mx-auto mb-5 size-12 fill-border text-border"
              />
              <blockquote :class="card.type === 'person' ? 'text-base/6 text-secondary-foreground' : 'text-2xl/9 text-secondary-foreground'">
                {{ card.text }}
              </blockquote>
            </figure>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
