import { spawnSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

const defaultTestDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:5432/xnutri_test?schema=public";
const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim() || defaultTestDatabaseUrl;
const parsed = new URL(testDatabaseUrl);
const databaseName = parsed.pathname.replace(/^\//, "");

if (!/(^|[-_])test($|[-_])/i.test(databaseName)) {
  throw new Error(`Banco de teste inválido: "${databaseName}". O nome precisa conter "test".`);
}

async function ensureTestDatabase() {
  const adminUrl = new URL(testDatabaseUrl);
  adminUrl.pathname = "/postgres";
  adminUrl.searchParams.delete("schema");

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    if (existing.rowCount === 0) {
      if (!/^[a-zA-Z0-9_-]+$/.test(databaseName)) {
        throw new Error("Nome do banco de teste contém caracteres inválidos.");
      }
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await client.end();
  }
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `Falha ao executar: ${command} ${args.join(" ")}${result.error ? ` (${result.error.message})` : ""}`,
    );
  }
}

async function main() {
  await ensureTestDatabase();

  const testEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: testDatabaseUrl,
    DIRECT_URL: testDatabaseUrl,
    TEST_DATABASE_URL: testDatabaseUrl,
    ALLOW_DESTRUCTIVE_SEED: "true",
  };

  run(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], testEnv);
  run(process.execPath, [path.resolve("node_modules/tsx/dist/cli.mjs"), "prisma/seed.ts"], testEnv);

  console.log(`Banco isolado "${databaseName}" preparado para os testes.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha ao preparar o banco de teste.");
  process.exit(1);
});
