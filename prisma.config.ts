import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Match Next.js precedence: shell/hosting variables > .env.local > .env.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const migrationDatabaseUrl =
  process.env.DIRECT_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations prefer a direct connection. The application itself uses the
    // pooled DATABASE_URL in src/lib/db/prisma.ts.
    url: migrationDatabaseUrl,
  },
});
