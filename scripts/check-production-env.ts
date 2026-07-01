import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const strict = process.argv.includes("--strict");
const errors: string[] = [];
const warnings: string[] = [];

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

const databaseUrl = firstValue(
  process.env.DATABASE_URL,
  process.env.POSTGRES_PRISMA_URL,
  process.env.POSTGRES_URL,
  process.env.DATABASE_URL_POOLED,
  process.env.NEON_DATABASE_URL,
);
const directUrl = firstValue(
  process.env.DIRECT_URL,
  process.env.POSTGRES_URL_NON_POOLING,
  process.env.DATABASE_URL_UNPOOLED,
  process.env.NEON_DATABASE_URL_UNPOOLED,
);
const vercelHostname = firstValue(process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL);
const appUrl = firstValue(
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.AUTH_URL,
  process.env.NEXTAUTH_URL,
  vercelHostname ? `https://${vercelHostname}` : undefined,
);
const authSecret = firstValue(process.env.AUTH_SECRET, process.env.NEXTAUTH_SECRET);
const mercadoPagoEnvironment = process.env.MERCADO_PAGO_ENVIRONMENT ?? "sandbox";

function parseUrl(name: string, value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    errors.push(`${name} não é uma URL válida.`);
    return null;
  }
}

const parsedDatabaseUrl = parseUrl("DATABASE_URL", databaseUrl);
if (!databaseUrl) {
  errors.push("DATABASE_URL não foi configurada.");
} else if (!parsedDatabaseUrl || !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol)) {
  errors.push("DATABASE_URL precisa ser uma connection string postgresql://.");
} else if (["localhost", "127.0.0.1", "::1", "host.docker.internal", "postgres"].includes(parsedDatabaseUrl.hostname)) {
  errors.push("DATABASE_URL aponta para Docker/localhost. Use a URL pooler do PostgreSQL online em produção.");
}

const parsedDirectUrl = parseUrl("DIRECT_URL", directUrl);
if (!directUrl) {
  warnings.push("DIRECT_URL não configurada; migrations usarão DATABASE_URL. No Neon, prefira a URL direta.");
} else if (!parsedDirectUrl || !["postgres:", "postgresql:"].includes(parsedDirectUrl.protocol)) {
  errors.push("DIRECT_URL precisa ser uma connection string postgresql://.");
} else if (["localhost", "127.0.0.1", "::1", "host.docker.internal", "postgres"].includes(parsedDirectUrl.hostname)) {
  errors.push("DIRECT_URL aponta para Docker/localhost. Use a URL direta do banco online.");
}

const parsedAppUrl = parseUrl("NEXT_PUBLIC_APP_URL", appUrl);
if (!appUrl) {
  warnings.push("NEXT_PUBLIC_APP_URL não foi configurada e a URL automática da Vercel não está disponível.");
} else if (!parsedAppUrl || parsedAppUrl.protocol !== "https:") {
  errors.push("NEXT_PUBLIC_APP_URL precisa usar HTTPS em produção.");
} else if (["localhost", "127.0.0.1", "::1"].includes(parsedAppUrl.hostname)) {
  errors.push("NEXT_PUBLIC_APP_URL não pode apontar para localhost em produção.");
}

if (!authSecret) {
  errors.push(
    'AUTH_SECRET não foi configurada. Gere no PowerShell com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
  );
} else if (authSecret.length < 32) {
  errors.push("AUTH_SECRET deve ter pelo menos 32 caracteres aleatórios.");
}

if (!["sandbox", "production"].includes(mercadoPagoEnvironment)) {
  errors.push("MERCADO_PAGO_ENVIRONMENT deve ser sandbox ou production.");
}

if (mercadoPagoEnvironment === "production" && process.env.MERCADO_PAGO_ACCESS_TOKEN?.startsWith("TEST-")) {
  errors.push("MERCADO_PAGO_ENVIRONMENT está em production, mas o Access Token é de teste.");
}

const optionalIntegrations = [
  "MERCADO_PAGO_ACCESS_TOKEN",
  "MERCADO_PAGO_WEBHOOK_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

for (const name of optionalIntegrations) {
  if (!process.env[name]) {
    const message = `${name} não configurada; a integração correspondente ficará indisponível.`;
    if (strict) errors.push(message);
    else warnings.push(message);
  }
}

for (const warning of warnings) console.warn(`AVISO: ${warning}`);

if (errors.length > 0) {
  for (const error of errors) console.error(`ERRO: ${error}`);
  console.error(`\nConfiguração de produção inválida (${errors.length} erro(s)). Consulte docs/PRODUCAO.md.`);
  process.exit(1);
}

console.log("Configuração principal de produção validada sem expor segredos.");
