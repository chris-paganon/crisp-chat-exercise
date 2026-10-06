import type { IsoTimestamp } from "../types/json";

/** Optimistic entity timestamps use the same UTC representation as server JSON. */
export function nowTimestamp(): IsoTimestamp {
  return new Date().toISOString();
}

/** Convert a trusted entity timestamp to epoch milliseconds for sorting or formatting. */
export function timestampMillis(value: IsoTimestamp): number {
  return Date.parse(value);
}
