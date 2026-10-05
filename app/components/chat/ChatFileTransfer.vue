<script setup lang="ts">
import { Download, File, X } from "lucide-vue-next";
import type { TransferView } from "@/lib/file-transfer/model";
import { isTransferActive, transferPercentage } from "@/lib/file-transfer/model";

const props = defineProps<{ transfer: TransferView }>();
defineEmits<{ accept: []; decline: []; cancel: []; download: []; remove: [] }>();
const active = computed(() => isTransferActive(props.transfer));
const incoming = computed(() => props.transfer.direction === "incoming");
const percentage = computed(() => transferPercentage(props.transfer));
const showProgress = computed(() => ["transferring", "finishing", "completed"].includes(props.transfer.status));
const label = computed(() => {
  switch (props.transfer.status) {
    case "offering": return "Sending offer…";
    case "offered": return incoming.value ? "Wants to send you a file" : "Waiting for permission…";
    case "preparing": return "Preparing storage…";
    case "connecting": return "Connecting to the other participant…";
    case "transferring": return incoming.value ? "Receiving…" : "Sending…";
    case "finishing": return "Confirming receipt…";
    case "interrupted": return "Transfer interrupted";
    case "completed": return incoming.value ? (props.transfer.available ? "Ready to download" : "Received · local file unavailable") : "Received by recipient";
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
        v-if="!active"
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss file transfer"
        title="Dismiss and release browser storage"
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
      Keep this page open until the transfer finishes. You can close the chat or switch conversations.
    </p>
    <p
      v-if="incoming && transfer.status === 'completed' && transfer.available"
      class="mt-2 text-xs text-muted-foreground"
    >
      You can return to this conversation to download. Download before leaving this page.
    </p>
    <div class="mt-3 flex flex-wrap gap-2">
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
        v-else-if="active"
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
