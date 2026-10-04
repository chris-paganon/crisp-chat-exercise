import type { MaybeRefOrGetter } from "vue";

export function useConversationAnimation(
  conversation: MaybeRefOrGetter<HTMLElement | null | undefined>,
  messageTimes: readonly number[],
  cycleDuration = 7000,
) {
  const isVisible = useElementVisibility(conversation);
  const documentVisibility = useDocumentVisibility();
  const reducedMotion = usePreferredReducedMotion();
  const elapsed = ref(0);

  const messageClasses = "translate-y-3 opacity-0 transition duration-400 ease-out data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none";

  const visibleMessages = computed(() => reducedMotion.value === "reduce"
    ? messageTimes.length
    : messageTimes.filter(time => elapsed.value >= time).length);

  useRafFn(({ delta }) => {
    if (!isVisible.value || documentVisibility.value !== "visible" || reducedMotion.value === "reduce") return;

    elapsed.value = (elapsed.value + Math.min(delta, 100)) % cycleDuration;
  });

  return { messageClasses, visibleMessages };
}
