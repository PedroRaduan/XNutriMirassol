# Guia de Deploy

> O guia completo, atualizado e com comandos prontos está em [PRODUCAO.md](./PRODUCAO.md).

## Plataforma recomendada

Vercel para o Next.js e PostgreSQL gerenciado em Neon, Supabase, RDS ou Railway.

## Variáveis obrigatórias

- `NEXT_PUBLIC_APP_URL`
- `AUTH_SECRET`
- `DATABASE_URL`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Pipeline

1. Configure as variáveis no provedor.
2. Execute migrations no deploy:

```bash
npm run db:deploy
```

3. Rode seed apenas em ambiente inicial ou staging:

```bash
npm run db:seed
```

4. Faça build:

```bash
npm run build
```

## Produção

Use credenciais de produção do Mercado Pago, domínio HTTPS em `NEXT_PUBLIC_APP_URL` e webhook apontando para `/api/payments/mercado-pago/webhook`.
