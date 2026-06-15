# XNutri E-commerce

E-commerce profissional para a XNutri, loja de suplementos e fitness de Mirassol-SP.

## Stack

- Next.js 16+ App Router, TypeScript e Tailwind CSS 4
- Server Components, Server Actions e API Routes
- PostgreSQL com Prisma ORM 7
- Auth.js/NextAuth com credenciais, hash bcrypt e papéis `CLIENT`/`ADMIN`
- React Hook Form e Zod
- Mercado Pago para Checkout Pro, PIX/cartão via preferência e webhooks
- Estrutura preparada para Cloudinary

## Estrutura

```text
src/app                 Rotas públicas, cliente, admin e APIs
src/components          Componentes de layout, produto, carrinho, checkout e formulários
src/lib/actions         Server Actions de auth, carrinho, checkout e admin
src/lib/ecommerce       Carrinho, cupons, pedidos e estoque
src/lib/payments        Integração Mercado Pago
src/lib/shipping        CEP, frete e retirada
src/lib/security        Rate limiting, sanitização e origem
prisma/schema.prisma    Schema completo
prisma/seed.ts          Seed com 25 produtos
prisma/migrations       SQL completo da migração inicial
docs                    Guias operacionais
```

## Instalação Rápida

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`, `AUTH_SECRET` e Mercado Pago.
2. Instale dependências:

```bash
npm install
```

3. Suba o PostgreSQL local, se for usar Docker:

```bash
docker compose up -d
```

4. Gere o Prisma Client e aplique o banco:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Rode localmente:

```bash
npm run dev
```

Contas criadas pelo seed:

- Admin: `admin@xnutri.com.br` / `Admin@12345`
- Cliente: `cliente@xnutri.com.br` / `Cliente@12345`

## Entregáveis

- Schema Prisma completo: `prisma/schema.prisma`
- SQL completo: `prisma/migrations/20260614210000_init/migration.sql`
- Seed com 25 produtos: `prisma/seed.ts`
- Variáveis: `.env.example`
- Guias: `docs/`

## Documentação

- Instalação: `docs/instalacao.md`
- Deploy: `docs/deploy.md`
- Mercado Pago: `docs/mercado-pago.md`
- Produtos: `docs/produtos.md`
- Banners: `docs/banners.md`
- Estoque: `docs/estoque.md`
