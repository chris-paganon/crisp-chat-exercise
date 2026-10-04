import { drizzle } from "drizzle-orm/node-postgres";

export const getDb = () => {
  const { databaseUrl } = useRuntimeConfig();
  return drizzle(databaseUrl);
};
