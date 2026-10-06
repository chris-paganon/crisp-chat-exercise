import type { IsoTimestamp } from "~~/shared/types/json";
import { timestampMillis } from "~~/shared/utils/date";

/** English labels in an explicit timezone; storage always retains the UTC instant. */
export function createDateLabels(timeZone: string) {
  const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short" });
  const timeFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return {
    dateLabel: (value: IsoTimestamp) => dateFormat.format(timestampMillis(value)),
    timeLabel: (value: IsoTimestamp) => timeFormat.format(timestampMillis(value)),
  };
}
