/** A UTC ISO 8601 timestamp produced by Date.toISOString() or JSON serialization. */
export type IsoTimestamp = string;

/** JSON representation of our plain data objects; database Date fields become strings. */
export type JsonSerialized<T> = T extends Date
  ? IsoTimestamp
  : T extends object
    ? { [K in keyof T]: JsonSerialized<T[K]> }
    : T;
