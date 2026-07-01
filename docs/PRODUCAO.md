# Produção da XNutri: banco online, Vercel e integrações

Este é o guia principal para publicar a XNutri sem depender do PostgreSQL do Docker. Os comandos abaixo devem ser executados na raiz do projeto, onde ficam `package.json`, `prisma.config.ts` e `docker-compose.yml`.

## Arquitetura recomendada

```text
Desenvolvimento                         Produção
Next.js em localhost                    Next.js na Vercel
        |                                       |
PostgreSQL no Docker                    DATABASE_URL pooler
                                                |
                                        PostgreSQL no Neon
                                                |
                                        DIRECT_URL para migrations

Imagens: Cloudinary em ambos os ambientes
Pagamentos: Mercado Pago teste/local e produção/publicado
```

Recomendação: **Vercel + Neon + Cloudinary + Mercado Pago**.

- A Vercel é a opção mais direta para o Next.js usado neste projeto.
- O Neon oferece PostgreSQL gerenciado, SSL e conexão pooler adequada a funções serverless.
- O Cloudinary mantém imagens fora do disco temporário da hospedagem.
- O Docker continua útil no computador, mas não é publicado como banco da loja.

## Por que o Docker local para de funcionar no deploy

No computador, `localhost:5432` aponta para o próprio computador e o Docker expõe o PostgreSQL nessa porta. Na Vercel, `localhost` aponta para a função da Vercel. O container do seu computador não está lá e não pode ser acessado pela internet.

O projeto antigo ainda usava `postgresql://...@localhost:5432/...` como fallback quando `DATABASE_URL` não existia. Isso escondia a configuração ausente e causava erros de conexão depois da publicação. Agora:

- produção rejeita banco em `localhost`, `127.0.0.1`, `postgres` ou `host.docker.internal`;
- `DATABASE_URL` ausente gera um erro claro;
- a aplicação usa URL pooler e as migrations preferem uma URL direta;
- o build da Vercel valida o ambiente e executa `prisma migrate deploy`.

## 1. Preparar o projeto local

```powershell
cd C:\Users\Sharif\Downloads\xnutri
Copy-Item .env.example .env.local
npm ci
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run admin:create
npm run dev
```

No `.env.local`, mantenha para o Docker:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xnutri?schema=public
DIRECT_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

Gere a chave local de autenticação:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Cole o resultado em `AUTH_SECRET`. Nunca envie `.env.local` para o GitHub.

## 2. Criar o PostgreSQL online no Neon

1. Crie uma conta em `https://console.neon.tech`.
2. Crie um projeto chamado `xnutri-production`.
3. Escolha uma região próxima da região usada pelo projeto na Vercel.
4. Abra **Connect** no painel do banco.
5. Ative **Connection pooling** e copie a URL com `-pooler` no host. Essa será a `DATABASE_URL`.
6. Desative **Connection pooling** e copie a URL direta. Essa será a `DIRECT_URL`.
7. Confirme que as duas URLs terminam com `sslmode=require` ou com os parâmetros de SSL fornecidos pelo Neon.

Formato esperado, apenas como exemplo:

```env
DATABASE_URL=postgresql://usuario:senha@ep-exemplo-pooler.us-east-2.aws.neon.tech/xnutri?sslmode=require
DIRECT_URL=postgresql://usuario:senha@ep-exemplo.us-east-2.aws.neon.tech/xnutri?sslmode=require
```

Não copie esses valores de exemplo. Use exatamente as duas URLs exibidas no seu painel Neon.

## 3. Testar o banco online antes de publicar

Abra um PowerShell novo. As variáveis abaixo duram somente nessa janela:

```powershell
$env:DATABASE_URL="COLE_A_URL_POOLER_DO_NEON"
$env:DIRECT_URL="COLE_A_URL_DIRETA_DO_NEON"
npm run db:validate
npm run db:status
npm run db:deploy
```

Para um banco novo e vazio, rode o seed uma única vez:

```powershell
npm run db:seed
```

**Atenção:** o seed recria dados iniciais e não deve ser executado em uma loja que já tem vendas reais. Em produção já usada, rode apenas `npm run db:deploy`.

Crie ou atualize o primeiro administrador:

```powershell
$env:ADMIN_EMAIL="seu-email@dominio.com"
$env:ADMIN_PASSWORD="COLOQUE_UMA_SENHA_FORTE"
$env:ADMIN_NAME="Administrador XNutri"
npm run admin:create
```

Limpe os segredos da janela ao terminar:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DIRECT_URL -ErrorAction SilentlyContinue
Remove-Item Env:ADMIN_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:ADMIN_NAME -ErrorAction SilentlyContinue
```

## 4. Variáveis de produção

Configure no painel da hospedagem, nunca no código:

| Variável | Uso | Obrigatória |
| --- | --- | --- |
| `DATABASE_URL` | URL pooler do Neon usada pelo site, admin e PDV | Sim |
| `DIRECT_URL` | URL direta usada pelo Prisma Migrate | Recomendada |
| `AUTH_SECRET` | Assina sessões de autenticação | Sim |
| `AUTH_URL` | URL pública usada pelo Auth.js | Sim |
| `NEXTAUTH_URL` | Compatibilidade com integrações NextAuth | Recomendada |
| `AUTH_TRUST_HOST` | Confia no host encaminhado pela Vercel | Sim, `true` |
| `NEXT_PUBLIC_APP_URL` | Domínio HTTPS usado em SEO, retornos e webhooks | Sim |
| `MERCADO_PAGO_ACCESS_TOKEN` | Token secreto do Mercado Pago | Para pagamentos |
| `MERCADO_PAGO_PUBLIC_KEY` | Chave pública da aplicação | Para pagamentos |
| `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` | Chave pública disponível no navegador | Para pagamentos |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Valida `x-signature` dos webhooks | Sim em produção |
| `CLOUDINARY_CLOUD_NAME` | Conta Cloudinary | Para uploads |
| `CLOUDINARY_API_KEY` | Identificador da API Cloudinary | Para uploads |
| `CLOUDINARY_API_SECRET` | Segredo da API Cloudinary | Para uploads |
| `CLOUDINARY_FOLDER` | Pasta dos ativos, normalmente `xnutri` | Recomendada |
| `CORREIOS_USER` | Usuário da API Correios | Quando integrar Correios |
| `CORREIOS_PASSWORD` | Senha da API Correios | Quando integrar Correios |
| `CORREIOS_TOKEN` | Token da API Correios | Quando integrar Correios |
| `ADMIN_EMAIL` | E-mail usado pelo script de admin | Somente ao criar admin |
| `ADMIN_PASSWORD` | Senha usada pelo script de admin | Somente ao criar admin |

O projeto também reconhece os nomes criados por integrações da Vercel/Neon: `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `DATABASE_URL_POOLED`, `DATABASE_URL_UNPOOLED`, `NEON_DATABASE_URL` e `NEON_DATABASE_URL_UNPOOLED`. Valores vazios são ignorados para não esconder outra conexão válida.

Na Vercel, a URL pública pode vir automaticamente de `VERCEL_PROJECT_PRODUCTION_URL` ou `VERCEL_URL`. Para domínio próprio, continue configurando `NEXT_PUBLIC_APP_URL`, `AUTH_URL` e `NEXTAUTH_URL` explicitamente.

Exemplo de URLs públicas:

```env
NEXT_PUBLIC_APP_URL=https://xnutrimirassol.com.br
AUTH_URL=https://xnutrimirassol.com.br
NEXTAUTH_URL=https://xnutrimirassol.com.br
AUTH_TRUST_HOST=true
```

## 5. Publicar na Vercel

1. Envie o projeto para um repositório privado ou público no GitHub.
2. Na Vercel, clique em **Add New > Project** e importe o repositório.
3. Confirme **Framework Preset: Next.js**.
4. Não defina Output Directory. O Next.js cuida disso.
5. O arquivo `vercel.json` já define:
   - Install Command: `npm ci`;
   - Build Command: `npm run vercel-build`.
6. Em **Settings > Environment Variables**, cadastre as variáveis da seção anterior.
7. Em **Automatically expose System Environment Variables**, mantenha a opção ativada.
8. Marque as credenciais reais para **Production**.
9. Use outro projeto/branch do Neon para **Preview**, para uma PR não migrar o banco real.
10. Faça o primeiro deploy.
11. Abra **Deployments > seu deploy > Build Logs** e confirme:
    - validação do ambiente concluída;
    - Prisma Client gerado;
    - migrations aplicadas;
    - Next.js compilado.

O comando executado pela Vercel é:

```powershell
npm run production:check
prisma generate
prisma migrate deploy
next build
```

Não use `prisma migrate dev` na Vercel. Esse comando é somente para criar migrations durante o desenvolvimento.

## 6. Autenticação, admin e PDV

1. Gere um `AUTH_SECRET` exclusivo de produção com pelo menos 32 bytes aleatórios.
2. Use o domínio HTTPS em `AUTH_URL`, `NEXTAUTH_URL` e `NEXT_PUBLIC_APP_URL`.
3. Depois das migrations, execute `npm run admin:create` apontando para o banco online.
4. Acesse `/admin/login` e entre com o admin criado.
5. Acesse `/pdv/login` com um admin que tenha o módulo `pos`.
6. O proxy protege `/admin/*` e `/pdv/*`; usuários comuns são redirecionados.
7. Em produção, os cookies do Auth.js usam as regras seguras do ambiente HTTPS e o modo de admin demonstrativo fica desativado.

## 7. Mercado Pago: teste e produção

### Ambiente de teste

Use credenciais de teste e mantenha:

```env
MERCADO_PAGO_ENVIRONMENT=sandbox
MERCADO_PAGO_ACCESS_TOKEN=TEST-...
MERCADO_PAGO_PUBLIC_KEY=TEST-...
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-...
```

### Ambiente real

1. No painel Mercado Pago, abra **Suas integrações** e selecione a aplicação.
2. Copie Access Token e Public Key de produção.
3. Na Vercel, use `MERCADO_PAGO_ENVIRONMENT=production` e as credenciais reais.
4. Configure o webhook de pagamentos:

```text
https://SEU-DOMINIO/api/payments/mercado-pago/webhook
```

5. Selecione o evento **Pagamentos**.
6. Copie a assinatura secreta exibida pelo Mercado Pago para `MERCADO_PAGO_WEBHOOK_SECRET`.
7. Faça novo deploy depois de alterar variáveis públicas.
8. Use o simulador de notificações do Mercado Pago e confirme resposta HTTP `200`.

O endpoint valida `x-signature` e `x-request-id` antes de consultar o pagamento na API. Assinatura inválida responde `401`; segredo ausente em produção responde `503`. O status aprovado atualiza o pedido e baixa o estoque dentro de uma transação.

Nunca misture Access Token de teste com Public Key de produção.

## 8. Cloudinary e imagens

1. Crie uma conta em `https://cloudinary.com`.
2. No Dashboard, copie Cloud Name, API Key e API Secret.
3. Cadastre as três variáveis na Vercel.
4. Use `CLOUDINARY_FOLDER=xnutri`.
5. Faça deploy novamente.
6. Entre em `/admin/produtos` e envie uma imagem JPG, PNG, WebP ou AVIF com até 4 MB.
7. Confirme que a URL salva começa com `https://res.cloudinary.com/`.

O projeto não grava uploads no disco da Vercel. A rota protegida `/api/admin/uploads/cloudinary` envia os arquivos ao Cloudinary e retorna a URL HTTPS.

## 9. Railway ou Render como alternativa

Também é possível hospedar o Next.js e o PostgreSQL no Railway ou Render:

1. Crie um serviço PostgreSQL gerenciado.
2. Copie a URL externa com SSL para `DATABASE_URL` e `DIRECT_URL`.
3. Configure todas as demais variáveis no serviço web.
4. Install Command: `npm ci`.
5. Build Command: `npm run vercel-build` ou `npm run db:deploy && npm run build`.
6. Start Command: `npm run start`.

Mesmo nessas plataformas, não aponte produção para o container Docker do seu computador.

## 10. Testes obrigatórios após publicar

### Banco e site público

1. Abra a home e o catálogo.
2. Pesquise e abra um produto.
3. Adicione ao carrinho e atualize a quantidade.
4. Calcule o frete, escolha uma opção e abra o checkout.
5. Finalize um pedido de teste e confirme que ele aparece no admin.

### Admin e estoque

1. Entre em `/admin/login`.
2. Cadastre um produto pequeno com imagem.
3. Ajuste o estoque.
4. Crie um cupom e valide no carrinho.
5. Mude o status de um pedido.
6. Confira dashboard, financeiro e relatórios.

### PDV

1. Entre em `/pdv/login`.
2. Abra o caixa.
3. Busque um produto por nome ou SKU.
4. Faça uma venda de teste.
5. Confira baixa de estoque e comprovante.
6. Feche o caixa e valide os relatórios.

### Integrações

1. Envie imagem no admin e abra a URL do Cloudinary.
2. Crie pagamento de teste no checkout.
3. Envie webhook pelo simulador Mercado Pago.
4. Confirme o status do pedido e a baixa de estoque.

## 11. Logs e diagnóstico

Na Vercel:

1. **Deployments > Build Logs** para falhas de instalação, Prisma e build.
2. **Observability > Runtime Logs** para banco, login, checkout, uploads e webhooks.
3. Filtre pela rota problemática, por exemplo `/api/payments/mercado-pago/webhook`.
4. Nunca imprima connection strings, tokens ou senhas nos logs.

Localmente, valide antes de enviar:

```powershell
npm run lint
npm run typecheck
npm run db:validate
npm run build
git diff --check
```

Para simular a validação da produção sem publicar, use variáveis online temporárias e rode:

```powershell
npm run production:check
```

Use a verificação estrita, que também exige Mercado Pago e Cloudinary:

```powershell
npm run production:check -- --strict
```

## 12. Erros comuns

### `MissingSecret`

`AUTH_SECRET` está ausente ou não chegou ao ambiente do deploy. Gere uma chave nova, cadastre-a em Production e faça redeploy.

### `DATABASE_URL not found`

Cadastre `DATABASE_URL` na Vercel. Confirme que ela está marcada para o ambiente correto e não contém aspas extras.

### `Prisma Client did not initialize`

Rode `npm ci` e `npm run db:generate`. O projeto já executa `prisma generate` no `postinstall` e antes dos builds.

### `P1001 Can't reach database server`

Confira host, senha, projeto ativo, região e SSL. Se o host for `localhost`, a variável de produção está errada. Copie novamente a URL do Neon.

### `P2021 table does not exist`

As migrations não foram aplicadas:

```powershell
npm run db:deploy
```

### `SSL connection error`

Use a URL fornecida pelo provedor com `sslmode=require`. Não remova os parâmetros adicionados pelo Neon.

### `migration failed`

Use `DIRECT_URL` sem `-pooler`, confira `npm run db:status` e leia o erro da migration. Não apague a pasta `prisma/migrations` nem execute `db push` para esconder divergências em produção.

### `build failed`

Rode localmente `npm run lint`, `npm run typecheck` e `npm run build`. Na Vercel, confira se o Node, as variáveis e `npm ci` estão corretos.

### Webhook Mercado Pago responde `401`

O `MERCADO_PAGO_WEBHOOK_SECRET` não corresponde à assinatura da aplicação que enviou o evento. Não use o segredo de outra aplicação ou ambiente.

### Webhook Mercado Pago não chega

A URL deve ser pública, HTTPS e terminar em `/api/payments/mercado-pago/webhook`. `localhost` nunca funciona como destino externo.

### Upload retorna `503`

Uma ou mais variáveis Cloudinary estão ausentes. Cadastre Cloud Name, API Key e API Secret e faça redeploy.

### Admin volta para o login

Confirme `AUTH_SECRET`, domínio público, migrations e o admin criado no mesmo banco apontado por `DATABASE_URL`. Verifique também `admin_users.active` e a permissão do módulo.

### O site ainda usa `localhost` publicado

Revise `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`, `AUTH_URL` e `NEXTAUTH_URL`. Rode `npm run production:check`. O código bloqueia banco local e URL pública local quando `NODE_ENV=production`.

## 13. Checklist final de produção

- [ ] Home e catálogo abrem no domínio real.
- [ ] `DATABASE_URL` usa o endpoint pooler do banco online.
- [ ] `DIRECT_URL` usa o endpoint direto do banco online.
- [ ] Nenhuma variável de produção aponta para `localhost`.
- [ ] `npm run db:status` não mostra migrations pendentes.
- [ ] Seed foi usado somente no banco vazio.
- [ ] Primeiro admin foi criado no banco online.
- [ ] Login de cliente e admin funcionam.
- [ ] `/admin` e `/pdv` exigem autenticação e permissão.
- [ ] Produtos, estoque, cupons e pedidos persistem após atualizar a página.
- [ ] Carrinho, frete e checkout funcionam no celular e desktop.
- [ ] Venda do PDV baixa o mesmo estoque do site.
- [ ] Dashboard, financeiro e relatórios carregam dados reais.
- [ ] Upload salva URL `res.cloudinary.com`.
- [ ] Credenciais Mercado Pago correspondem ao ambiente escolhido.
- [ ] Webhook público responde `200` para assinatura válida.
- [ ] Pagamento aprovado atualiza pedido e estoque.
- [ ] `AUTH_SECRET` é forte e exclusivo de produção.
- [ ] `NEXT_PUBLIC_APP_URL`, `AUTH_URL` e `NEXTAUTH_URL` usam HTTPS.
- [ ] `npm run production:check -- --strict` passa.
- [ ] `npm run lint`, `npm run typecheck` e `npm run build` passam.
