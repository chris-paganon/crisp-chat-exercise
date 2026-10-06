import type { IsoTimestamp } from "~~/shared/types/json";

export function dateLabel(value: IsoTimestamp) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function timeLabel(value: IsoTimestamp) {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
