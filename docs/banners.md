# Guia para Alterar Banners

## Pelo admin

1. Acesse `/admin/banners`.
2. Cadastre título, subtítulo, imagem, CTA e localização.
3. Escolha:

- `HOME_HERO`
- `HOME_PROMO`
- `CATALOG`

## Imagens

Em produção, configure Cloudinary no `.env` e use o botão de upload do admin. O campo também aceita uma URL segura `https://res.cloudinary.com/...`.

## Seed

Banners iniciais ficam em `prisma/seed.ts` e são criados junto com a base de demonstração.
