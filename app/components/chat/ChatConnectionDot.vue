<script setup lang="ts">
const props = defineProps<{ roomId: string }>();
const { $roomSessions } = useNuxtApp();
const connection = computed(() => $roomSessions.sessions.value
  .find(session => session.roomId === props.roomId)?.chat.connection.value ?? "connecting");

const status = computed(() => {
  switch (connection.value) {
    case "connected":
      return { label: "Connected · Messages are saved", color: "bg-chart-2" };
    case "connecting":
      return { label: "Connecting…", color: "bg-amber-500" };
    case "reconnecting":
      return { label: "Connection lost · Reconnecting…", color: "bg-amber-500" };
    case "closed":
      return { label: "Disconnected", color: "bg-destructive" };
    default:
      return { label: "Unknown connection status", color: "bg-muted-foreground" };
  }
});
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center"
    :title="status.label"
    role="status"
  >
    <span
      class="size-2 rounded-full"
      :class="status.color"
      aria-hidden="true"
    />
    <span class="sr-only">{{ status.label }}</span>
  </span>
</template>
