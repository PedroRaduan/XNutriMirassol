import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

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
  throw new Error("Defina DATABASE_URL antes de criar a funcionária do PDV.");
}

const cashierSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(254),
  password: z.string()
    .min(12, "A senha precisa ter pelo menos 12 caracteres.")
    .max(128, "A senha pode ter no máximo 128 caracteres.")
    .regex(/[a-z]/, "Inclua uma letra minúscula.")
    .regex(/[A-Z]/, "Inclua uma letra maiúscula.")
    .regex(/\d/, "Inclua um número.")
    .regex(/[^A-Za-z0-9]/, "Inclua um símbolo."),
  name: z.string().trim().min(2).max(100),
});

function exitWithUsage(): never {
  console.error("Informe o e-mail, a senha e, opcionalmente, o nome da funcionária.");
  console.error('Use: npm run cashier:create -- "caixa@dominio.com" "SenhaForte!123" "Nome da funcionária"');
  process.exit(1);
}

const [email, password, name = "Caixa XNutri"] = process.argv.slice(2);
if (!email || !password) exitWithUsage();

const parsed = cashierSchema.safeParse({ email, password, name });
if (!parsed.success) {
  throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
}

const cashierInput = parsed.data;

if (["Admin@12345", "Gerente@12345", "Caixa@12345", "Cliente@12345"].includes(cashierInput.password)) {
  throw new Error("Não use uma senha de exemplo ou compartilhada.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: cashierInput.email },
    include: { adminProfile: true },
  });

  if (existing && !existing.adminProfile) {
    throw new Error("Esse e-mail já pertence a um cliente. Use um e-mail novo e exclusivo para a funcionária.");
  }

  if (existing?.adminProfile && existing.adminProfile.role !== "CASHIER") {
    throw new Error(`Esse e-mail já possui o perfil ${existing.adminProfile.role} e não pode ser convertido em CASHIER.`);
  }

  const passwordHash = await bcrypt.hash(cashierInput.password, 12);

  const cashier = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: cashierInput.email },
      create: {
        name: cashierInput.name,
        email: cashierInput.email,
        passwordHash,
        role: "ADMIN",
      },
      update: {
        name: cashierInput.name,
        passwordHash,
        role: "ADMIN",
      },
    });

    const adminUser = await tx.adminUser.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        role: "CASHIER",
        active: true,
        permissions: { all: false, modules: ["pos"] },
      },
      update: {
        role: "CASHIER",
        active: true,
        permissions: { all: false, modules: ["pos"] },
      },
    });

    await tx.auditLog.create({
      data: {
        action: "staff.cashier.provisioned",
        entity: "admin_users",
        entityId: adminUser.id,
        metadata: {
          source: "cashier:create",
          targetAdminUserId: adminUser.id,
          role: "CASHIER",
        },
      },
    });

    return user;
  });

  console.log(`Funcionária do PDV pronta: ${cashier.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Não foi possível criar a funcionária do PDV.");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
