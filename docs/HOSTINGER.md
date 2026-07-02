# Deploy da XNutri na Hostinger

Este guia prepara a XNutri para **Aplicação Web Node.js gerenciada** da Hostinger. A aplicação roda como servidor Next.js; o PostgreSQL continua em um provedor externo, como o Neon. O `docker-compose.yml` permanece apenas para desenvolvimento local.

Documentação oficial usada como referência:

- [Adicionar uma Aplicação Web Node.js](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Adicionar variáveis de ambiente](https://www.hostinger.com/support/how-to-add-environment-variables-during-node-js-application-deployment/)
- [Fazer redeploy](https://www.hostinger.com/support/how-to-redeploy-a-node-js-application/)
- [Consultar erros nos logs de build](https://www.hostinger.com/support/how-to-troubleshoot-a-failed-node-js-deployment-using-build-logs/)

## 1. Arquitetura de produção

```text
Cliente
  |
  v
Hostinger - servidor Next.js gerenciado
  |-- site público
  |-- admin e PDV
  |-- APIs, autenticação e checkout
  |
  +--> Neon PostgreSQL
  +--> Cloudinary
  +--> Mercado Pago
```

Não use `localhost`, `127.0.0.1`, o nome `postgres` do Docker ou uma pasta local para dados persistentes em produção.

## 2. Plano e versão do Node.js

A Hostinger oferece Aplicações Web Node.js nos planos Business Web Hosting e Cloud compatíveis. No hPanel, selecione:

- Framework: **Next.js**
- Versão do Node.js: **22.x**
- Gerenciador: **npm**
- Branch: `main` ou a branch que será publicada

O projeto declara as versões compatíveis no `package.json`. Node.js 22 é a escolha recomendada para esta combinação de Next.js e Prisma.

## 3. Teste antes de enviar ao GitHub

Na pasta do projeto, execute:

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
```

O build local pode usar o banco configurado no `.env.local`. Não envie esse arquivo ao GitHub.

## 4. Enviar o projeto para o GitHub

Confira primeiro se nenhum segredo será enviado:

```powershell
git status
git diff -- .env.local .env
```

Os arquivos `.env`, `.env.local` e `.env.hostinger` são ignorados pelo Git. Depois, envie somente o código que deseja publicar:

```powershell
git add .
git commit -m "prepare hostinger managed node deploy"
git push
```

Revise o `git status` antes do `git add .` se existirem alterações locais que você não deseja publicar.

## 5. Criar a aplicação no hPanel

1. Entre no hPanel da Hostinger.
2. Acesse **Websites**.
3. Clique em **Adicionar site**.
4. Selecione **Aplicação Web Node.js** ou **Node.js Apps**.
5. Escolha **Importar repositório Git**.
6. Conecte o GitHub e selecione o repositório da XNutri.
7. Selecione a branch de produção.
8. Confirme que o framework detectado é **Next.js**.
9. Selecione Node.js **22.x**.

Use estes valores quando o hPanel solicitar:

| Campo | Valor |
| --- | --- |
| Install command | `npm ci` |
| Build command | `npm run hostinger-build` |
| Start command | `npm run start` |
| Output directory | `.next` somente se o painel solicitar |
| Package manager | `npm` |

Não configure um arquivo de entrada manual quando o framework estiver detectado como Next.js. O script `npm run start` inicia o servidor e respeita a porta fornecida pela hospedagem.

## 6. Preparar as variáveis da Hostinger

Crie uma cópia local do modelo:

```powershell
Copy-Item .env.production.example .env.hostinger
notepad .env.hostinger
```

Preencha o arquivo e, na etapa **Environment variables** do hPanel, escolha **Import from .env file**. Importe `.env.hostinger`. Esse arquivo não deve ser enviado ao GitHub.

### Variáveis obrigatórias

```env
NODE_ENV=production
XNUTRI_DEPLOYMENT=production

NEXT_PUBLIC_APP_URL=https://seu-dominio.com.br
AUTH_URL=https://seu-dominio.com.br
NEXTAUTH_URL=https://seu-dominio.com.br
AUTH_SECRET=COLE_UM_SEGREDO_FORTE
AUTH_TRUST_HOST=true

DATABASE_URL=COLE_A_URL_POOLER_DO_NEON
DIRECT_URL=COLE_A_URL_DIRETA_DO_NEON
DATABASE_POOL_MAX=2
```

Use o endereço HTTPS completo e sem barra no final nas três variáveis de URL.

Gere o `AUTH_SECRET` no PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Neon

- `DATABASE_URL`: endpoint com **pooler**, usado pelo site em funcionamento.
- `DIRECT_URL`: endpoint direto, sem `-pooler`, usado nas migrations.
- As duas URLs devem usar SSL, normalmente com `sslmode=require`.
- Nunca use a URL do PostgreSQL Docker na Hostinger.
- Não deixe `...`, `SENHA`, `USUARIO` ou outros textos de exemplo na connection string.
- Mantenha somente uma variável com o nome `DATABASE_URL` no arquivo importado.

### Integrações

Adicione também as variáveis do Mercado Pago e Cloudinary quando essas integrações forem usadas:

```env
MERCADO_PAGO_ENVIRONMENT=sandbox
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_PUBLIC_KEY=
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_WEBHOOK_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=xnutri
```

Faça o primeiro deploy com Mercado Pago em `sandbox`. Mude para `production` apenas depois de cadastrar as credenciais reais e concluir um teste controlado.

## 7. O que o build da Hostinger faz

O comando configurado no projeto executa:

```text
npm run production:check
prisma migrate deploy
prisma generate
next build
```

Assim, o deploy é interrompido antes de publicar quando faltarem banco, domínio HTTPS ou `AUTH_SECRET`. As migrations existentes são aplicadas com `prisma migrate deploy`; o seed não roda automaticamente e não deve rodar em um banco que já possui vendas reais.

## 8. Criar o primeiro administrador

Depois que as migrations passarem, crie o administrador a partir do seu computador, apontando temporariamente para o banco online:

```powershell
$env:DATABASE_URL="COLE_A_URL_POOLER_DO_NEON"
$env:DIRECT_URL="COLE_A_URL_DIRETA_DO_NEON"
npm run admin:create -- admin@xnutri.com.br "USE_UMA_SENHA_FORTE"
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DIRECT_URL -ErrorAction SilentlyContinue
```

Não mantenha `ADMIN_PASSWORD` cadastrado no hPanel depois que o usuário já tiver sido criado.

## 9. Domínio, Auth.js e HTTPS

Quando o domínio definitivo estiver associado à aplicação:

1. Confirme que o SSL da Hostinger está ativo.
2. Atualize `NEXT_PUBLIC_APP_URL`, `AUTH_URL` e `NEXTAUTH_URL` para o domínio definitivo.
3. Abra **Settings & Redeploy**.
4. Salve e faça o redeploy.

Essas três URLs precisam ser idênticas. Uma diferença entre `www` e sem `www` pode afetar cookies e retornos de pagamento; escolha a versão principal e redirecione a outra.

## 10. Mercado Pago e Cloudinary

Webhook do Mercado Pago:

```text
https://seu-dominio.com.br/api/payments/mercado-pago/webhook
```

Depois de cadastrar o webhook, copie o segredo fornecido pelo Mercado Pago para `MERCADO_PAGO_WEBHOOK_SECRET` e faça redeploy.

O upload do admin usa Cloudinary. Não grave imagens no disco da Hostinger, pois arquivos de runtime podem ser substituídos em um novo deploy.

## 11. Testes depois do deploy

Abra primeiro:

```text
https://seu-dominio.com.br/api/health
```

Resultado saudável:

```json
{"status":"ok","database":"connected","service":"xnutri"}
```

Depois teste:

1. Home e catálogo.
2. Página de produto.
3. Carrinho e cálculo de frete.
4. Checkout com entrega e retirada.
5. Login em `/admin/login`.
6. Cadastro e edição de produto.
7. Upload de imagem.
8. Entrada no `/pdv` e abertura do caixa.
9. Pedido em sandbox no Mercado Pago.
10. Atualização do pedido pelo webhook.

## 12. Logs e redeploy

No hPanel:

1. Abra o Dashboard da aplicação.
2. Entre em **Deployments**.
3. Abra o último deploy para ver o build log.
4. Para mudar variáveis ou comandos, use **Settings & Redeploy**.
5. Depois de alterar uma variável, sempre faça redeploy.

Erros comuns:

| Erro | Correção |
| --- | --- |
| `DATABASE_URL não foi configurada` | Importe a URL pooler no ambiente da aplicação e faça redeploy. |
| `DATABASE_URL ainda contém texto de exemplo` | Substitua toda a linha pela URL pooler real, sem `...`. |
| `P1001` | Confirme host, senha, SSL e se o Neon está ativo. |
| `P2021` | Confira se `npm run hostinger-build` aplicou as migrations. |
| `AUTH_SECRET não foi configurada` | Gere o segredo, salve no hPanel e faça redeploy. |
| `NEXT_PUBLIC_APP_URL precisa usar HTTPS` | Use o domínio público com `https://`. |
| `Prisma Client did not initialize` | Confirme `postinstall` e o build `npm run hostinger-build`. |
| `403` após redeploy | Faça novo redeploy para a Hostinger regenerar o roteamento da aplicação Node.js. |
| Upload falha | Revise as três chaves do Cloudinary. |
| Webhook falha | Revise a URL pública e `MERCADO_PAGO_WEBHOOK_SECRET`. |

## 13. Checklist final

- [ ] Plano Hostinger compatível com Aplicação Web Node.js.
- [ ] Framework detectado como Next.js.
- [ ] Node.js 22.x selecionado.
- [ ] Build command `npm run hostinger-build`.
- [ ] Start command `npm run start`.
- [ ] `DATABASE_URL` usa o pooler do PostgreSQL online.
- [ ] `DIRECT_URL` usa a conexão direta.
- [ ] `AUTH_SECRET` forte e privado.
- [ ] URLs públicas usam o mesmo domínio HTTPS.
- [ ] `XNUTRI_DEPLOYMENT=production` configurada.
- [ ] Migrations aplicadas.
- [ ] `/api/health` retorna `database: connected`.
- [ ] Admin, PDV, produtos, estoque e checkout testados.
- [ ] Cloudinary testado.
- [ ] Mercado Pago e webhook testados em sandbox.
- [ ] Nenhuma variável de produção usa `localhost`.
