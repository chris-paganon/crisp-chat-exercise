import { computed, onMounted, ref } from "vue";
import { createDateLabels } from "@/lib/date";
import type { IsoTimestamp } from "~~/shared/types/json";

/** Match SSR during hydration, then display dates in the browser's timezone. */
export function useDateLabels() {
  const timeZone = ref("UTC");

  onMounted(() => {
    timeZone.value = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  const labels = computed(() => createDateLabels(timeZone.value));

  return {
    dateLabel: (value: IsoTimestamp) => labels.value.dateLabel(value),
    timeLabel: (value: IsoTimestamp) => labels.value.timeLabel(value),
  };
}
