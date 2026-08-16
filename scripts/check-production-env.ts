import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const strict = process.argv.includes("--strict");
const isVercelPreview = process.env.VERCEL_ENV === "preview";
const errors: string[] = [];
const warnings: string[] = [];

function reportRequiredProductionIntegration(message: string) {
  if (isVercelPreview) warnings.push(`${message} O Preview continuará com essa integração desativada.`);
  else errors.push(message);
}

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
const googleClientId = firstValue(process.env.GOOGLE_CLIENT_ID, process.env.AUTH_GOOGLE_ID);
const googleClientSecret = firstValue(process.env.GOOGLE_CLIENT_SECRET, process.env.AUTH_GOOGLE_SECRET);
const pagBankEnvironment = process.env.PAGBANK_ENVIRONMENT ?? "sandbox";
const authSessionMaxAge = Number(process.env.AUTH_SESSION_MAX_AGE_SECONDS ?? 28_800);

function parseUrl(name: string, value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    errors.push(`${name} não é uma URL válida.`);
    return null;
  }
}

function isPlaceholderConnectionString(value: string | undefined) {
  if (!value) return false;
  return /\.\.\.|(?:COLE_|USUARIO|SENHA|HOST_DO_BANCO|EP-(?:EXEMPLO|EXAMPLE)|PLACEHOLDER|CHANGE_ME)/i.test(value);
}

function isPlaceholderSecret(value: string | undefined) {
  return Boolean(value && /(?:COLE_|SEU_TOKEN|TOKEN_AQUI|EXEMPLO|EXAMPLE|PLACEHOLDER|CHANGE_ME)/i.test(value));
}

const parsedDatabaseUrl = parseUrl("DATABASE_URL", databaseUrl);
if (!databaseUrl) {
  errors.push("DATABASE_URL não foi configurada.");
} else if (isPlaceholderConnectionString(databaseUrl)) {
  errors.push("DATABASE_URL ainda contém texto de exemplo. Copie a URL pooler completa do PostgreSQL online.");
} else if (!parsedDatabaseUrl || !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol)) {
  errors.push("DATABASE_URL precisa ser uma connection string postgresql://.");
} else if (["localhost", "127.0.0.1", "::1", "host.docker.internal", "postgres"].includes(parsedDatabaseUrl.hostname)) {
  errors.push("DATABASE_URL aponta para Docker/localhost. Use a URL pooler do PostgreSQL online em produção.");
} else if (parsedDatabaseUrl.hostname.endsWith(".neon.tech")) {
  const sslMode = parsedDatabaseUrl.searchParams.get("sslmode");
  if (!sslMode || !["require", "verify-full"].includes(sslMode)) {
    warnings.push("DATABASE_URL do Neon deve validar TLS com sslmode=verify-full.");
  } else if (sslMode === "require") {
    warnings.push("DATABASE_URL usa sslmode=require. Prefira verify-full para manter validação estrita em futuras versões do driver PostgreSQL.");
  }
}

const parsedDirectUrl = parseUrl("DIRECT_URL", directUrl);
if (!directUrl) {
  warnings.push("DIRECT_URL não configurada; migrations usarão DATABASE_URL. No Neon, prefira a URL direta.");
} else if (isPlaceholderConnectionString(directUrl)) {
  errors.push("DIRECT_URL ainda contém texto de exemplo. Copie a URL direta completa do PostgreSQL online.");
} else if (!parsedDirectUrl || !["postgres:", "postgresql:"].includes(parsedDirectUrl.protocol)) {
  errors.push("DIRECT_URL precisa ser uma connection string postgresql://.");
} else if (["localhost", "127.0.0.1", "::1", "host.docker.internal", "postgres"].includes(parsedDirectUrl.hostname)) {
  errors.push("DIRECT_URL aponta para Docker/localhost. Use a URL direta do banco online.");
} else if (parsedDirectUrl.hostname.endsWith(".neon.tech") && !["require", "verify-full"].includes(parsedDirectUrl.searchParams.get("sslmode") ?? "")) {
  warnings.push("DIRECT_URL do Neon deve validar TLS com sslmode=verify-full.");
}

const parsedAppUrl = parseUrl("NEXT_PUBLIC_APP_URL", appUrl);
if (!appUrl) {
  warnings.push("NEXT_PUBLIC_APP_URL não foi configurada. Informe o domínio HTTPS da hospedagem.");
} else if (!parsedAppUrl || parsedAppUrl.protocol !== "https:") {
  errors.push("NEXT_PUBLIC_APP_URL precisa usar HTTPS em produção.");
} else if (["localhost", "127.0.0.1", "::1"].includes(parsedAppUrl.hostname)) {
  errors.push("NEXT_PUBLIC_APP_URL não pode apontar para localhost em produção.");
} else if (parsedAppUrl.hostname.endsWith(".invalid") || /(^|\.)example\.(com|org|net)$/i.test(parsedAppUrl.hostname)) {
  errors.push("NEXT_PUBLIC_APP_URL ainda aponta para um domínio de exemplo.");
}

if (!authSecret) {
  errors.push(
    'AUTH_SECRET não foi configurada. Gere no PowerShell com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
  );
} else if (authSecret.length < 32) {
  errors.push("AUTH_SECRET deve ter pelo menos 32 caracteres aleatórios.");
}

const cronSecret = process.env.CRON_SECRET?.trim();
if (!cronSecret) {
  reportRequiredProductionIntegration(
    "CRON_SECRET não configurada. Ela é necessária para liberar reservas de estoque expiradas na Vercel.",
  );
} else if (cronSecret.length < 32) {
  errors.push("CRON_SECRET deve ter pelo menos 32 caracteres aleatórios.");
}

if (Boolean(googleClientId) !== Boolean(googleClientSecret)) {
  errors.push("Google OAuth incompleto. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET juntos.");
} else if (!googleClientId) {
  warnings.push("Google OAuth não configurado; o botão de login com Google ficará oculto.");
}

if (!Number.isInteger(authSessionMaxAge) || authSessionMaxAge < 900 || authSessionMaxAge > 86_400) {
  errors.push("AUTH_SESSION_MAX_AGE_SECONDS deve ser um inteiro entre 900 e 86400 segundos.");
}

if (!["sandbox", "production"].includes(pagBankEnvironment)) {
  errors.push("PAGBANK_ENVIRONMENT deve ser sandbox ou production.");
}

if (pagBankEnvironment === "production" && process.env.PAGBANK_TOKEN?.toLowerCase().includes("sandbox")) {
  errors.push("PAGBANK_ENVIRONMENT está em production, mas o token parece ser de sandbox.");
}

if (!process.env.PAGBANK_TOKEN?.trim()) {
  reportRequiredProductionIntegration(
    "PAGBANK_TOKEN não configurada. O checkout online não pode ser publicado em produção sem ela.",
  );
} else if (isPlaceholderSecret(process.env.PAGBANK_TOKEN)) {
  errors.push("PAGBANK_TOKEN ainda contém um valor de exemplo.");
}

if (process.env.PAGBANK_TOKEN && !process.env.PAGBANK_WEBHOOK_TOKEN) {
  warnings.push("PAGBANK_WEBHOOK_TOKEN não configurada; o projeto usará PAGBANK_TOKEN para validar a assinatura do webhook.");
}

if (process.env.CLOUDINARY_FOLDER && !/^[A-Za-z0-9_/-]{1,120}$/.test(process.env.CLOUDINARY_FOLDER)) {
  errors.push("CLOUDINARY_FOLDER contém caracteres inválidos.");
}

const optionalIntegrations = [
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
  console.error(
    `\nConfiguração de produção inválida (${errors.length} erro(s)). Consulte GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md.`,
  );
  process.exit(1);
}

console.log("Configuração principal de produção validada sem expor segredos.");
