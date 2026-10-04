import { drizzle } from "drizzle-orm/node-postgres";

let database: ReturnType<typeof drizzle> | undefined;

export const getDb = () => {
  // Reuse the pool across requests, including operator membership refreshes.
  database ??= drizzle(useRuntimeConfig().databaseUrl);
  return database;
};
