import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env", quiet: true });
loadEnv({ path: ".env.local", override: true, quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Defina DATABASE_URL antes de criar o administrador.");
}

const email = process.env.ADMIN_EMAIL ?? process.argv[2];
const password = process.env.ADMIN_PASSWORD ?? process.argv[3];
const name = process.env.ADMIN_NAME ?? process.argv[4] ?? "Administrador XNutri";

if (!email || !password) {
  throw new Error("Use: npm run admin:create -- admin@xnutri.com.br SenhaForte123");
}

if (password.length < 8) {
  throw new Error("A senha precisa ter pelo menos 8 caracteres.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      name,
      email: email.toLowerCase(),
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
        modules: ["dashboard", "products", "categories", "inventory", "coupons", "orders", "customers", "reports", "content", "shipping", "settings", "audit"],
      },
    },
    update: {
      role: "ADMIN",
      active: true,
      permissions: {
        all: true,
        modules: ["dashboard", "products", "categories", "inventory", "coupons", "orders", "customers", "reports", "content", "shipping", "settings", "audit"],
      },
    },
  });

  console.log(`Administrador pronto: ${email.toLowerCase()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
