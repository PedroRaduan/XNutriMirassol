import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const databaseUrl =
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/xnutri?schema=public";
  const poolMax = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "5", 10);

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 5,
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.PRISMA_LOG_ERRORS === "true"
        ? ["error", "warn"]
        : process.env.NODE_ENV === "development"
          ? ["warn"]
          : [],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
