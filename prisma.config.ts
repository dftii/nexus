import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env files on its own. Load it here when present so
// `prisma migrate` / `prisma studio` pick up DATABASE_URL (Node >= 20.12).
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on variables already present in the environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Read lazily so `prisma generate` and `prisma validate` work without a
    // database (fresh clone, CI). Commands that connect fail clearly if unset.
    url: process.env.DATABASE_URL ?? "",
  },
});
