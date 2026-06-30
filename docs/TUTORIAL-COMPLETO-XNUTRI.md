# Tutorial completo para conectar e publicar a XNutri

Este arquivo é um passo a passo prático para ligar o projeto inteiro: banco, Prisma, seed, Cloudinary, Mercado Pago, admin, PDV, checkout e deploy na Vercel.

Use os comandos no PowerShell, dentro da pasta do projeto:

```powershell
cd C:\Users\Sharif\Downloads\xnutri
```

## 1. Arquivos importantes

| Função | Arquivo |
|---|---|
| Variáveis locais | `.env.local` |
| Modelo do banco | `prisma/schema.prisma` |
| Dados iniciais | `prisma/seed.ts` |
| Configuração do Prisma | `prisma.config.ts` |
| Cloudinary | `src/lib/cloudinary.ts` |
| Checkout | `src/components/checkout/checkout-form.tsx` |
| Carrinho | `src/app/(site)/(shop)/carrinho/page.tsx` |
| Catálogo | `src/app/(site)/(shop)/catalogo/page.tsx` |
| Admin | `src/app/admin/(protected)/page.tsx` |
| PDV | `src/app/pdv/page.tsx` |

## 2. Instalar dependências

```powershell
npm install
```

Depois gere o Prisma Client:

```powershell
npm run db:generate
```

Neste projeto, o `prisma/schema.prisma` usa:

```prisma
generator client {
  provider = "prisma-client-js"
}
```

Então os imports corretos continuam sendo:

```ts
import { PrismaClient, UserRole } from "@prisma/client";
```

Se aparecer erro dizendo que `PrismaClient` não existe, rode:

```powershell
npm run db:generate
npm run build
```

## 3. Criar `.env.local`

Crie ou edite o arquivo:

```powershell
notepad .env.local
```

Coloque este modelo e troque os valores entre `<...>`:

```env
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/NOME_DO_BANCO?sslmode=require"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
AUTH_SECRET="troque-por-uma-chave-grande-e-segura"

CLOUDINARY_CLOUD_NAME="seu_cloud_name"
CLOUDINARY_API_KEY="sua_api_key"
CLOUDINARY_API_SECRET="sua_api_secret"
CLOUDINARY_FOLDER="xnutri"

MERCADO_PAGO_ACCESS_TOKEN="seu_access_token"
MERCADO_PAGO_WEBHOOK_SECRET="um_segredo_para_webhook"

PDV_RECEIPT_FOOTER="Obrigado pela compra. Este comprovante não substitui documento fiscal."
```

Para gerar um `AUTH_SECRET`, rode:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 4. Conectar o banco PostgreSQL

Você pode usar Neon, Supabase, Railway, Render ou outro PostgreSQL.

Depois de colocar `DATABASE_URL` no `.env.local`, rode:

```powershell
npm run db:deploy
```

Se estiver desenvolvendo localmente e quiser criar migration de desenvolvimento:

```powershell
npm run db:migrate
```

Depois coloque dados iniciais:

```powershell
npm run db:seed
```

Para abrir o painel visual do banco:

```powershell
npm run db:studio
```

## 5. Criar usuário admin

Se o seed já criou um admin, use o login informado no README. Se quiser criar outro admin:

```powershell
npm run admin:create
```

Depois acesse:

```text
http://localhost:3000/admin
```

## 6. Conectar Cloudinary

No painel do Cloudinary, pegue:

- Cloud name
- API Key
- API Secret

Coloque no `.env.local`:

```env
CLOUDINARY_CLOUD_NAME="seu_cloud_name"
CLOUDINARY_API_KEY="sua_api_key"
CLOUDINARY_API_SECRET="sua_api_secret"
CLOUDINARY_FOLDER="xnutri"
```

O arquivo que usa isso é:

```text
src/lib/cloudinary.ts
```

Teste no admin:

1. Rode o site.
2. Entre em `/admin`.
3. Abra produtos ou banners.
4. Envie uma imagem.
5. Confirme se a URL gerada começa com `https://res.cloudinary.com/...`.

## 7. Conectar Mercado Pago

No Mercado Pago, crie uma aplicação e copie o Access Token.

No `.env.local`:

```env
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-ou-TEST-seu-token"
MERCADO_PAGO_WEBHOOK_SECRET="um_segredo_para_webhook"
```

No painel do Mercado Pago, configure o webhook para:

```text
https://SEU-DOMINIO.com/api/payments/mercado-pago/webhook
```

Para testar local, rode:

```powershell
npm run dev
```

Abra:

```text
http://localhost:3000
```

Faça um pedido pequeno e confira se o checkout cria o pagamento.

## 8. Rodar localmente

```powershell
npm run dev
```

Abra:

```text
http://localhost:3000
```

Rotas principais:

```text
Home:      http://localhost:3000
Catálogo:  http://localhost:3000/catalogo
Carrinho:  http://localhost:3000/carrinho
Checkout:  http://localhost:3000/checkout
Admin:     http://localhost:3000/admin
PDV:       http://localhost:3000/pdv
```

## 9. Testar antes de publicar

Rode:

```powershell
npm run lint
npm run build
```

Teste manualmente:

1. Abra a home.
2. Abra o catálogo.
3. Busque um produto.
4. Use filtros de preço, promoção e disponibilidade.
5. Abra um produto.
6. Clique em `Adicionar ao carrinho`.
7. Clique em `Comprar agora`.
8. Calcule frete pelo CEP no carrinho.
9. Escolha retirada na loja.
10. Finalize o checkout.
11. Entre no admin.
12. Cadastre produto, estoque, banner e cupom.
13. Abra o PDV.
14. Teste pagamento misto apenas uma vez e ajuste os valores.

## 10. Publicar na Vercel

No GitHub:

```powershell
git add .
git commit -m "melhora loja xnutri"
git push
```

Na Vercel:

1. Importe o repositório.
2. Configure as variáveis de ambiente.
3. Use o comando de build padrão:

```text
npm run build
```

O `package.json` já está preparado:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

Depois do primeiro deploy, no banco de produção rode:

```powershell
npm run db:deploy
npm run db:seed
```

Na Vercel, ajuste:

```env
NEXT_PUBLIC_APP_URL="https://seu-dominio.com"
```

## 11. Variáveis obrigatórias na Vercel

Configure em `Project Settings > Environment Variables`:

```env
DATABASE_URL
NEXT_PUBLIC_APP_URL
AUTH_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_FOLDER
MERCADO_PAGO_ACCESS_TOKEN
MERCADO_PAGO_WEBHOOK_SECRET
PDV_RECEIPT_FOOTER
```

## 12. O que depende de dados reais da loja

Troque no admin:

- Fotos reais dos produtos.
- Preços finais.
- Custos dos produtos.
- Estoque real.
- WhatsApp oficial.
- Instagram oficial.
- Endereço final da loja.
- Horário de atendimento.
- Textos de política de troca, privacidade e termos.
- Credenciais reais de Mercado Pago.
- Dados reais do Cloudinary.

## 13. Comandos rápidos

```powershell
cd C:\Users\Sharif\Downloads\xnutri
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Validação:

```powershell
npm run lint
npm run build
```

Banco:

```powershell
npm run db:studio
```

Admin:

```powershell
npm run admin:create
```

## 14. Se der erro

### Erro no Prisma Client

```powershell
npm run db:generate
npm run build
```

### Erro de banco

Confira se `DATABASE_URL` está correta e depois rode:

```powershell
npm run db:deploy
```

### Erro no CEP

Confira se o CEP tem 8 números. O checkout valida CEP, cidade e UF para evitar endereço inconsistente.

### Imagem não envia

Confira:

```env
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

### Mercado Pago não abre pagamento

Confira:

```env
MERCADO_PAGO_ACCESS_TOKEN
NEXT_PUBLIC_APP_URL
```

E confirme se o domínio publicado está correto.
