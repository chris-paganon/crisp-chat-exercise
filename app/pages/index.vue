<script setup lang="ts">
import HomeAutomation from "@/components/home/HomeAutomation.vue";
import HomeBenefits from "@/components/home/HomeBenefits.vue";
import HomeComparison from "@/components/home/HomeComparison.vue";

import { authClient } from "@/lib/auth-client";

definePageMeta({ layout: false });

const { data: session } = await authClient.useSession(useFetch);
const isOperator = computed(() => Boolean(session.value && !session.value.user.isAnonymous));

useSeoMeta({
  title: "The AI Customer Support Platform for every Business - Crisp",
  description: "Customer Support",
});
</script>

<template>
  <div class="min-h-screen bg-background">
    <HomeNavbar :is-operator="isOperator" />
    <main>
      <HomeHero />
      <HomeGetToKnow />
      <HomeExplore />
      <HomeCentralize />
      <HomeTeamCapabilities />
      <HomeExperiences />
      <HomeSpecificNeeds />
      <HomeAutomation />
      <HomeBenefits />
      <HomeComparison />
      <HomeTestimonials />
      <HomeInboxResources />
      <HomeChooseProvider />
      <HomeHowItWorks />
      <HomeReady />
    </main>
    <HomeFooter />
    <ChatVisitorWidget />
  </div>
</template>
