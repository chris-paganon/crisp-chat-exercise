import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.NUXT_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("NUXT_DATABASE_URL is required to run Drizzle Kit");
}

export default defineConfig({
  out: "./server/db/migrations",
  schema: "./server/db/schema",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
