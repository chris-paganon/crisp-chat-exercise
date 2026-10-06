<script setup lang="ts">
import { Download, File, X } from "lucide-vue-next";
import type { TransferView } from "@/lib/file-transfer/model";
import { isTransferActive, transferPercentage } from "@/lib/file-transfer/model";

const props = defineProps<{ transfer: TransferView }>();
const emit = defineEmits<{ accept: []; resume: [file?: globalThis.File]; decline: []; cancel: []; download: []; remove: [] }>();
const sourceInput = ref<HTMLInputElement>();

function reselect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    emit("resume", file);
  }

  input.value = "";
}
const active = computed(() => isTransferActive(props.transfer));
const incoming = computed(() => props.transfer.direction === "incoming");
const percentage = computed(() => transferPercentage(props.transfer));
const showProgress = computed(() => ["transferring", "finishing", "completed", "interrupted"].includes(props.transfer.status));
const label = computed(() => {
  if (props.transfer.controlPending) return "Confirming cancellation…";

  switch (props.transfer.status) {
    case "verifying": return "Verifying the source file…";
    case "waiting-connection": return "Waiting for connection…";
    case "waiting": return "Waiting for the other participant or a free transfer slot…";
    case "offering": return "Sending offer…";
    case "offered": return incoming.value ? "Wants to send you a file" : "Waiting for permission…";
    case "preparing": return "Preparing storage…";
    case "connecting": return "Connecting to the other participant…";
    case "transferring": return incoming.value ? "Receiving…" : "Sending…";
    case "finishing": return "Confirming receipt…";
    case "interrupted": return "Transfer interrupted";
    case "completed": return incoming.value ? (props.transfer.available ? "Ready to download" : "Received · local file deleted") : "Received by recipient";
    case "declined": return "File declined";
    case "cancelled": return "Transfer cancelled";
    case "failed": return "Transfer failed";
    default: return "File transfer";
  }
});

function sizeLabel(bytes: number) {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const unit = bytes > 0 ? Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1) : 0;
  return `${(bytes / 1024 ** unit).toLocaleString(undefined, { maximumFractionDigits: unit ? 2 : 0 })} ${units[unit]}`;
}
</script>

<template>
  <div
    class="w-80 max-w-[95%] rounded-lg border bg-background p-3.5 shadow-xs"
    :class="{ 'border-destructive/50': transfer.status === 'failed' }"
  >
    <div class="flex items-start gap-3">
      <div class="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-primary">
        <File :size="19" />
      </div>
      <div class="min-w-0 flex-1">
        <p
          class="truncate text-sm font-medium"
          :title="transfer.name"
        >
          {{ transfer.name }}
        </p>
        <p class="mt-0.5 text-xs text-muted-foreground">
          {{ sizeLabel(transfer.size) }}
        </p>
      </div>
      <UiButton
        v-if="!active && incoming && transfer.hasLocalFile"
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Remove local file"
        title="Remove local file and keep chat history"
        @click="$emit('remove')"
      >
        <X :size="14" />
      </UiButton>
    </div>
    <p
      class="mt-3 text-xs font-medium"
      role="status"
    >
      {{ label }}
    </p>
    <div
      v-if="showProgress"
      class="mt-2 space-y-1.5"
    >
      <UiProgress
        :model-value="percentage"
        :aria-label="`File transfer: ${transfer.name}`"
      />
      <p class="text-xs text-muted-foreground">
        {{ sizeLabel(transfer.bytes) }} / {{ sizeLabel(transfer.size) }} · {{ percentage }}%
      </p>
    </div>
    <p
      v-if="transfer.message"
      class="mt-2 text-xs text-destructive"
    >
      {{ transfer.message }}
    </p>
    <p
      v-if="active"
      class="mt-2 text-xs text-muted-foreground"
    >
      Keep this page open until the transfer finishes.
    </p>
    <p
      v-if="transfer.status === 'interrupted'"
      class="mt-2 text-xs text-muted-foreground"
    >
      Saved progress is kept in this browser. Both participants must be online to resume.
    </p>
    <div class="mt-3 flex flex-wrap gap-2">
      <input
        ref="sourceInput"
        type="file"
        class="hidden"
        aria-label="Reselect the original file"
        @change="reselect"
      >
      <UiButton
        v-if="transfer.status === 'interrupted' || transfer.needsSource"
        type="button"
        size="sm"
        @click="transfer.needsSource ? sourceInput?.click() : emit('resume')"
      >
        {{ transfer.needsSource ? 'Reselect original file' : transfer.expired ? 'Restart receiving' : 'Resume transfer' }}
      </UiButton>
      <template v-if="incoming && transfer.status === 'offered'">
        <UiButton
          type="button"
          size="sm"
          @click="$emit('accept')"
        >
          Receive file
        </UiButton>
        <UiButton
          type="button"
          size="sm"
          variant="outline"
          @click="$emit('decline')"
        >
          Decline
        </UiButton>
      </template>
      <UiButton
        v-else-if="active || transfer.status === 'interrupted'"
        type="button"
        size="sm"
        variant="outline"
        @click="$emit('cancel')"
      >
        Cancel
      </UiButton>
      <UiButton
        v-if="incoming && transfer.status === 'completed' && transfer.available"
        type="button"
        size="sm"
        @click="$emit('download')"
      >
        <Download :size="14" />
        Download
      </UiButton>
    </div>
  </div>
</template>
