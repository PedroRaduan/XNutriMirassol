# Guia para Adicionar Produtos

## Pelo admin

1. Acesse `/admin/produtos`.
2. Informe categoria, nome, SKU, descrição, preço, estoque inicial e URL da imagem.
3. Marque destaque, mais vendido ou promoção quando aplicável.
4. Salve.

## Campos importantes

- `name`: nome comercial.
- `slug`: gerado automaticamente.
- `sku`: identificador único.
- `price`: preço de venda.
- `compareAtPrice`: preço riscado para promoção.
- `stock`: cria inventário inicial para a variação padrão.
- `imageUrl`: pode ser preenchido manualmente ou gerado pelo upload Cloudinary no admin.

## Pelo seed

Edite `prisma/seed.ts` e adicione um item ao array `products`. Depois execute:

```bash
npm run db:seed
```

Esse comando limpa e recria a base de demonstração, então use apenas em desenvolvimento.
