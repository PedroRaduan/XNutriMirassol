import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const databaseUrl = [
  process.env.DIRECT_URL,
  process.env.POSTGRES_URL_NON_POOLING,
  process.env.DATABASE_URL_UNPOOLED,
  process.env.NEON_DATABASE_URL_UNPOOLED,
  process.env.DATABASE_URL,
  process.env.POSTGRES_PRISMA_URL,
  process.env.POSTGRES_URL,
].find((value) => value?.trim())?.trim();

if (!databaseUrl) {
  throw new Error("Defina DATABASE_URL antes de criar o administrador.");
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

const email = firstNonEmpty(process.env.ADMIN_EMAIL, process.argv[2]);
const password = firstNonEmpty(process.env.ADMIN_PASSWORD, process.argv[3]);
const name = firstNonEmpty(process.env.ADMIN_NAME, process.argv[4]) ?? "Administrador XNutri";

function exitWithUsage(): never {
  console.error("Informe o e-mail e a senha do administrador.");
  console.error('Use: npm run admin:create -- "seu-email@dominio.com" "sua-senha-forte"');
  console.error("Ou defina ADMIN_EMAIL e ADMIN_PASSWORD antes de executar o comando.");
  process.exit(1);
}

if (!email || !password) exitWithUsage();

const adminEmail = email;
const adminPassword = password;

if (adminPassword.length < 8) {
  throw new Error("A senha precisa ter pelo menos 8 caracteres.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function main() {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    create: {
      name,
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: "ADMIN",
    },
    update: {
      name,
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.adminUser.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      role: "ADMIN",
      active: true,
      permissions: {
        all: true,
        modules: ["dashboard", "products", "categories", "inventory", "coupons", "orders", "customers", "reports", "finance", "content", "shipping", "settings", "audit"],
      },
    },
    update: {
      role: "ADMIN",
      active: true,
      permissions: {
        all: true,
        modules: ["dashboard", "products", "categories", "inventory", "coupons", "orders", "customers", "reports", "finance", "content", "shipping", "settings", "audit"],
      },
    },
  });

  console.log(`Administrador pronto: ${adminEmail.toLowerCase()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
