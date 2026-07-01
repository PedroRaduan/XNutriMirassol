import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { firstEnvironmentValue, isHostedProduction } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const databaseUrl = firstEnvironmentValue(
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL_POOLED,
    process.env.NEON_DATABASE_URL,
  );

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL não configurada. No desenvolvimento use o PostgreSQL do Docker; em produção configure a URL pooler do PostgreSQL gerenciado.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL inválida. Copie novamente a connection string PostgreSQL do provedor.");
  }

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error("DATABASE_URL precisa usar o protocolo postgresql://.");
  }

  if (
    isHostedProduction() &&
    ["localhost", "127.0.0.1", "::1", "host.docker.internal", "postgres"].includes(parsedUrl.hostname)
  ) {
    throw new Error(
      "DATABASE_URL de produção aponta para um banco local/Docker. Configure um PostgreSQL online, como Neon, antes de publicar.",
    );
  }

  const defaultPoolMax = process.env.NODE_ENV === "production" ? "2" : "5";
  const poolMax = Number.parseInt(process.env.DATABASE_POOL_MAX ?? defaultPoolMax, 10);

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : Number(defaultPoolMax),
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
