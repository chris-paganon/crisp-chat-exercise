<script setup lang="ts">
import { ArrowRight, Check, Heart, Inbox, Link2, MessageSquare, Plus } from "lucide-vue-next";
import { authClient } from "@/lib/auth-client";

definePageMeta({ layout: false });
useSeoMeta({ title: "Crisp — A little closer to your customers", description: "Good conversations make great customer experiences." });
useHead({ meta: [{ name: "referrer", content: "no-referrer" }] });
const route = useRoute();
const token = computed(() => typeof route.query.invite === "string" ? route.query.invite : undefined);
const { data: session } = await authClient.useSession(useFetch);
const isOperator = computed(() => session.value && !session.value.user.isAnonymous);
const operatorLink = "/auth?mode=sign-up&redirect=/operator";
</script>

<template>
  <div class="crisp-home">
    <header class="home-header">
      <NuxtLink
        to="/"
        aria-label="Crisp home"
      ><ChatCrispLogo /></NuxtLink>
      <nav
        aria-label="Main navigation"
        class="home-nav"
      >
        <a href="#experience">The experience</a><a href="#how-it-works">How it works</a>
      </nav>
      <div class="home-header-actions">
        <NuxtLink
          v-if="!isOperator"
          to="/auth?mode=sign-in&redirect=/operator"
          class="home-login"
        >Log in</NuxtLink>
        <NuxtLink
          :to="isOperator ? '/operator' : operatorLink"
          class="chat-button"
        >{{ isOperator ? 'Open inbox' : 'Get started' }}<ArrowRight :size="16" /></NuxtLink>
      </div>
    </header>
    <main>
      <section
        id="experience"
        class="home-hero"
      >
        <div class="hero-orbit hero-orbit-one" /><div class="hero-orbit hero-orbit-two" />
        <div class="hero-content">
          <span class="hero-badge"><span class="hero-badge-dot" /> A space for better conversations</span>
          <h1>A little closer to<br>your <span>customers.</span></h1>
          <p>One conversation. Two people.<br>A simpler way to make someone’s day.</p>
          <NuxtLink
            :to="isOperator ? '/operator' : operatorLink"
            class="chat-button hero-cta"
          >{{ isOperator ? 'Go to your inbox' : 'Start a conversation' }}<ArrowRight :size="19" /></NuxtLink>
          <div class="hero-caption">
            <Check :size="14" /> A personal touch, from the very first hello.
          </div>
          <div class="hero-features">
            <div><span class="hero-feature-icon feature-green"><MessageSquare :size="21" /></span><span><strong>All in one place</strong><small>Your conversations, together</small></span></div>
            <div><span class="hero-feature-icon feature-purple"><Link2 :size="21" /></span><span><strong>Just share a link</strong><small>A warm welcome in one click</small></span></div>
            <div><span class="hero-feature-icon feature-blue"><Heart :size="21" /></span><span><strong>Made for people</strong><small>Personal, simple, friendly</small></span></div>
          </div>
        </div>
        <div
          class="home-inbox-preview"
          aria-label="Preview of the operator inbox"
        >
          <aside>
            <ChatCrispLogo /><div class="preview-inbox-label">
              <Inbox :size="17" /> Inbox <span>1</span>
            </div><small>Your workspace</small><div class="preview-sidebar-item">
              All conversations
            </div>
          </aside>
          <div class="preview-room-list">
            <strong>Conversations <Plus :size="15" /></strong><div class="preview-selected-room">
              <span class="preview-avatar">V</span><div><b>Your next conversation</b><small>Waiting for a visitor to join</small></div>
            </div>
          </div>
          <div class="preview-conversation">
            <span class="preview-conversation-label">A great experience starts with a hello.</span><div class="preview-invite-icon">
              <Link2 :size="26" />
            </div><strong>Send a link. Make a connection.</strong><p>A private space for you and your customer.</p>
          </div>
        </div>
      </section>
      <section
        id="how-it-works"
        class="home-how"
      >
        <div><span class="chat-eyebrow">LESS FRICTION. MORE CONNECTION.</span><h2>You're one link away.</h2><p>Support that feels like talking to a person. Because it is.</p></div>
        <ol><li><span>01</span><h3>Create a conversation</h3><p>Your operator inbox keeps everything in one place.</p></li><li><span>02</span><h3>Invite your visitor</h3><p>Share a private link. No visitor signup needed.</p></li><li><span>03</span><h3>Make yourself at home</h3><p>A familiar chat space, ready for what's next.</p></li></ol>
      </section>
    </main>
    <footer class="home-footer">
      <ChatCrispLogo /><span>A little help. A human connection.</span><span>Chat experience preview</span>
    </footer>
    <ChatVisitorWidget :token="token" />
  </div>
</template>
