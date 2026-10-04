<template>
  <div class="flex min-h-screen flex-col bg-background">
    <header class="border-b bg-background">
      <nav class="flex h-16 items-center justify-center px-4">
        <NuxtLink
          to="/"
          aria-label="Crisp home"
        ><ChatCrispLogo /></NuxtLink>
      </nav>
    </header>
    <main class="flex grow flex-col">
      <slot />
    </main>
  </div>
</template>
