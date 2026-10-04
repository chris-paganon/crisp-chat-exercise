<script setup lang="ts">
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Database,
  ExternalLink,
  LockKeyhole,
  Rocket,
} from "lucide-vue-next";

useSeoMeta({
  title: "DockIY Nuxt Template",
  description: "A production-ready Nuxt starter for applications deployed with DockIY.",
});

const features = [
  {
    title: "Nuxt application",
    description: "Nuxt 4, TypeScript, Tailwind CSS, and shadcn-vue.",
    icon: Boxes,
  },
  {
    title: "Authentication",
    description: "Email verification, password reset, and PostgreSQL-backed sessions.",
    icon: LockKeyhole,
  },
  {
    title: "Database",
    description: "PostgreSQL 18 with Drizzle ORM and auditable SQL migrations.",
    icon: Database,
  },
  {
    title: "Deployment",
    description: "DockIY deployments with staging and production environments.",
    icon: Rocket,
  },
];

const documentation = [
  {
    title: "Nuxt Better Auth template guide",
    description: "Set up, customize, and deploy this template.",
    href: "https://dockiy.com/templates/nuxt-betterauth",
  },
  {
    title: "What is DockIY?",
    description: "Learn how DockIY manages self-hosted applications.",
    href: "https://dockiy.com/guide/",
  },
  {
    title: "Installation",
    description: "Install and configure the DockIY base stack.",
    href: "https://dockiy.com/guide/installation",
  },
  {
    title: "Deploy applications",
    description: "Ship an application with DockIY.",
    href: "https://dockiy.com/guide/deploying-apps",
  },
];
</script>

<template>
  <div class="overflow-hidden">
    <section class="border-b">
      <div class="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-[1fr_24rem] lg:items-center">
        <div class="max-w-3xl">
          <h1 class="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Build with Nuxt.<br>
            Deploy with DockIY.
          </h1>
          <p class="mt-6 max-w-2xl text-lg leading-8 text-pretty text-muted-foreground">
            A full-stack starter with authentication, PostgreSQL, migrations, encrypted secrets, and production-ready Docker deployment already wired together.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <UiButton as-child>
              <a
                href="https://dockiy.com/templates/nuxt-betterauth"
                target="_blank"
                rel="noreferrer"
              >
                Read the template guide
                <ArrowRight class="size-4" />
              </a>
            </UiButton>
            <UiButton
              as-child
              variant="outline"
            >
              <NuxtLink to="/auth?mode=sign-up">
                Try the auth flow
              </NuxtLink>
            </UiButton>
          </div>
        </div>

        <div class="rounded-xl border bg-muted/40 p-5 shadow-sm">
          <div class="mb-4 flex items-center gap-2 text-sm font-medium">
            <span
              class="flex gap-1.5"
              aria-hidden="true"
            >
              <span class="size-2.5 rounded-full bg-border" />
              <span class="size-2.5 rounded-full bg-border" />
              <span class="size-2.5 rounded-full bg-border" />
            </span>
            <span class="ml-2 text-muted-foreground">Get started</span>
          </div>
          <pre class="overflow-x-auto rounded-lg bg-foreground p-5 text-sm leading-7 text-background"><code><span class="text-background/50">$</span> cp .env.example .env
<span class="text-background/50">$</span> docker compose up -d
<span class="text-background/50">$</span> pnpm install
<span class="text-background/50">$</span> pnpm db:migrate
<span class="text-background/50">$</span> pnpm dev</code></pre>
          <p class="mt-4 text-sm text-muted-foreground">
            Requires Node.js 24+, pnpm 11+, and Docker.
          </p>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20">
      <div class="max-w-2xl">
        <p class="text-sm font-semibold text-muted-foreground">
          Included in the template
        </p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight">
          The foundation is ready
        </h2>
        <p class="mt-3 leading-7 text-muted-foreground">
          Start on your product instead of assembling infrastructure and deployment tooling.
        </p>
      </div>

      <div class="mt-10 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="feature in features"
          :key="feature.title"
          class="bg-background p-6"
        >
          <component
            :is="feature.icon"
            class="size-5"
            aria-hidden="true"
          />
          <h3 class="mt-5 font-semibold">
            {{ feature.title }}
          </h3>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">
            {{ feature.description }}
          </p>
        </article>
      </div>
    </section>

    <section class="border-t bg-muted/30">
      <div class="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg border bg-background">
            <BookOpen
              class="size-5"
              aria-hidden="true"
            />
          </div>
          <div>
            <h2 class="text-2xl font-bold tracking-tight">
              DockIY
            </h2>
          </div>
        </div>

        <div class="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            v-for="link in documentation"
            :key="link.href"
            :href="link.href"
            target="_blank"
            rel="noreferrer"
            class="group flex items-start justify-between gap-4 rounded-xl border bg-background p-5 transition-colors hover:bg-accent"
          >
            <span>
              <span class="font-semibold">{{ link.title }}</span>
              <span class="mt-1 block text-sm leading-6 text-muted-foreground">
                {{ link.description }}
              </span>
            </span>
            <ExternalLink
              class="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </section>
  </div>
</template>
