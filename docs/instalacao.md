# Guia de Instalação

## Requisitos

- Node.js 22 ou superior
- PostgreSQL 15 ou superior, ou Docker para usar o `docker-compose.yml`
- Conta Mercado Pago para ambiente de teste e produção
- Conta Cloudinary para uploads em produção

## Passos

1. Configure as variáveis:

```bash
cp .env.example .env
```

2. Ajuste `DATABASE_URL` com os dados do PostgreSQL.

3. Se quiser usar o Postgres local via Docker:

```bash
docker compose up -d
```

4. Instale e prepare o banco:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Inicie a aplicação:

```bash
npm run dev
```

6. Acesse `http://localhost:3000`.

## Banco

O schema está em `prisma/schema.prisma`. O SQL gerado está em `prisma/migrations/20260614210000_init/migration.sql`.
