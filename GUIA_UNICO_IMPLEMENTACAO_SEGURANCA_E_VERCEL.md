# Tutorial definitivo da XNutri — instalação, integrações, segurança e Vercel

Este é o único tutorial oficial do projeto. Ele substitui os tutoriais antigos de instalação, produção, Hostinger, Mercado Pago, Cloudinary, Google, PDV e deploy. A aplicação deve ser publicada exclusivamente na Vercel, usa PostgreSQL/Neon e está preparada para PagBank.

Nunca coloque senha, token, `DATABASE_URL` real ou chave de API neste arquivo, no GitHub, em prints ou em conversas. Os exemplos abaixo são intencionalmente falsos.

## 1. O que falta fazer agora

Conferência de código, banco isolado e testes locais realizada em 15/08/2026. A configuração remota da Vercel e os serviços externos ainda precisam da validação manual descrita neste guia.

### Já está pronto no código

- Loja pública, catálogo, produto, carrinho e checkout.
- Área do cliente, login por e-mail/senha e suporte opcional ao Google.
- Admin com produtos, categorias, estoque, cupons, pedidos, clientes, banners, entregas, financeiro, relatórios e auditoria.
- PDV com caixa, vendas, pagamentos, comprovante e movimentação de estoque.
- Prisma/PostgreSQL, migrations e conexão serverless com URL pooler.
- Reserva de estoque durante pagamento, liberação por cron e baixa idempotente.
- Checkout hospedado PagBank e webhook com validação de assinatura, valor, moeda e idempotência.
- Retomada do pagamento para cliente autenticado ou visitante com token opaco; URL de retorno formada sem parâmetros duplicados.
- Limite de cupom por cliente, liberação idempotente ao cancelar/expirar e trava transacional contra concorrência.
- Estado de pedido controlado por transições válidas e justificativa para confirmação manual de pagamento.
- Venda do PDV com chave de idempotência para impedir duplicação por clique ou repetição de requisição.
- Restrições financeiras no PostgreSQL e bloqueio de estoque abaixo das unidades já reservadas.
- Upload protegido para Cloudinary.
- Headers de segurança, validações de servidor, controle de permissões e rate limit básico.
- Painel administrativo instalável como PWA somente para o dono com papel `ADMIN`.
- Auditoria de dependências, Prisma, tipos, lint, testes unitários/componentes, E2E e build local fazem parte da validação obrigatória registrada na seção 15.

### Obrigatório antes de publicar para clientes

1. Rotacionar a senha do Neon, pois uma connection string real já foi compartilhada fora do painel seguro. Depois, atualizar `DATABASE_URL` e `DIRECT_URL` na Vercel.
2. Criar um banco/branch Neon separado para Preview. Preview não deve usar o banco de Production.
3. Adicionar na Vercel `CRON_SECRET`, `PAGBANK_ENVIRONMENT` e `PAGBANK_TOKEN`.
4. Configurar o PagBank primeiro em Sandbox e validar pagamento + webhook.
5. Adicionar as três credenciais do Cloudinary para upload de imagens.
6. Configurar todas as variáveis de Preview e confirmar que elas não apontam para Production.
7. Fazer um Preview Deployment e testar loja, admin, PDV, checkout, estoque, upload e PagBank.
8. Confirmar domínio final e deixar `NEXT_PUBLIC_APP_URL`, `AUTH_URL` e `NEXTAUTH_URL` iguais ao domínio HTTPS.
9. Cadastrar produtos, imagens, endereço, horários, fretes, retirada e dados reais da loja.
10. Ativar backup automático no Neon e executar pelo menos um teste de restauração em ambiente separado.
11. Ativar MFA nas contas Vercel, GitHub, Neon, PagBank, Cloudinary e Google.

### Opcional ou melhoria posterior

- Login Google: o botão fica oculto até `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` existirem.
- Recuperação de senha por e-mail ainda não possui provedor de e-mail/token completo. Não divulgue esse recurso como funcional até implementá-lo.
- MFA dentro do login do admin ainda não existe; use senha exclusiva e MFA nos provedores externos.
- Rate limit atual é local por instância. Ative Vercel Firewall/Bot Protection e avalie rate limit distribuído quando o tráfego crescer.
- Frete usa ViaCEP/BrasilAPI para endereço e preços/prazos cadastrados no admin. As credenciais `CORREIOS_*` estão reservadas, mas a cotação oficial dos Correios ainda não está integrada.
- Nota fiscal e e-mails transacionais não estão integrados.
- O painel instalável é PWA, não aplicativo publicado na App Store ou Play Store.

## 2. Arquitetura que deve ser mantida

```text
Cliente / Admin / PDV
        ↓ HTTPS
Vercel + Next.js + Auth.js + Server Actions/Functions
        ├── Neon PostgreSQL + Prisma
        ├── PagBank Checkout hospedado + webhook
        ├── Cloudinary para imagens
        ├── Google OAuth opcional
        └── ViaCEP/BrasilAPI para consulta de CEP
```

- Docker/PostgreSQL local: somente desenvolvimento e testes.
- Neon: banco gerenciado de Preview e Production.
- Vercel: única hospedagem da aplicação.
- Cloudinary: arquivos persistentes; não salve uploads no disco da Vercel.
- O navegador nunca é fonte confiável de preço, desconto, frete, estoque, total, papel ou status.

## 3. Contas e programas necessários

Crie ou tenha acesso a GitHub, Vercel, Neon, PagBank, Cloudinary e, opcionalmente, Google Cloud.

Instale Node.js 20.19+ ou 22.12+ LTS, npm 10+, Git e Docker Desktop. Confirme no PowerShell:

```powershell
node --version
npm --version
git --version
docker --version
```

Evite Node experimental quando possível. Para operação diária, prefira uma versão LTS compatível.

## 4. Arquivos importantes

| Arquivo | Função |
| --- | --- |
| `.env.example` | Modelo local, sem segredos reais |
| `.env.production.example` | Contrato de variáveis da Vercel |
| `docker-compose.yml` | PostgreSQL local |
| `prisma/schema.prisma` | Estrutura do banco |
| `prisma/migrations/` | Histórico de migrations |
| `prisma/seed.ts` | Seed destrutivo para banco novo/teste |
| `prisma.config.ts` | URL direta para migrations |
| `scripts/create-admin.ts` | Criação segura do dono |
| `scripts/check-production-env.ts` | Bloqueia deploy com configuração crítica ausente |
| `vercel.json` | Build e cron da Vercel |
| `src/auth.ts` | Auth.js, credenciais e Google |
| `src/proxy.ts` | Proteção inicial de `/admin` e `/pdv` |
| `src/lib/auth/permissions.ts` | Permissões por papel |
| `src/lib/payments/pagbank.ts` | Checkout e sincronização PagBank |
| `src/app/api/payments/pagbank/webhook/route.ts` | Webhook PagBank |
| `src/app/api/admin/uploads/cloudinary/route.ts` | Upload validado |

## 5. Instalação local do zero

Abra o PowerShell na pasta correta:

```powershell
Set-Location "C:\Users\Sharif\Downloads\xnutri"
npm ci
```

Crie `.env.local` apenas se ele ainda não existir:

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Para desenvolvimento local, confira estas linhas em `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
XNUTRI_DEPLOYMENT=local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xnutri?schema=public
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/xnutri?schema=public
DATABASE_POOL_MAX=5
```

Gere um `AUTH_SECRET` local e copie o resultado para `.env.local`. Não use o mesmo em Production:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Inicie o PostgreSQL e prepare Prisma:

```powershell
docker compose up -d
docker compose ps
npm run db:generate
npm run db:validate
npm run db:deploy
```

Crie o dono sem apagar dados:

```powershell
npm run admin:create -- "SEU_EMAIL" "SUA_SENHA_FORTE" "Dono da XNutri"
```

A senha precisa ter de 12 a 128 caracteres, maiúscula, minúscula, número e símbolo. Não use a senha mostrada em mensagens antigas.

Inicie e acesse:

```powershell
npm run dev
```

```text
Loja:  http://localhost:3000
Admin: http://localhost:3000/admin/login
PDV:   http://localhost:3000/pdv/login
Saúde: http://localhost:3000/api/health
```

Para parar o banco: `docker compose stop`.

### Seed local: somente em banco descartável

O seed apaga dados. Não execute em Production. Em banco local novo:

```powershell
$env:ALLOW_DESTRUCTIVE_SEED="true"
$env:ADMIN_EMAIL="SEU_EMAIL_LOCAL"
$env:ADMIN_PASSWORD="SUA_SENHA_LOCAL_FORTE"
npm run db:seed
Remove-Item Env:ALLOW_DESTRUCTIVE_SEED
Remove-Item Env:ADMIN_EMAIL
Remove-Item Env:ADMIN_PASSWORD
```

Se já existem produtos ou pedidos, não rode o seed.

## 6. Variáveis de ambiente

### Regras

- Local: `.env.local`, ignorado pelo Git.
- Vercel: painel ou CLI, nunca arquivo commitado.
- Production e Preview usam segredos e bancos diferentes.
- Somente `NEXT_PUBLIC_` chega ao navegador.
- Nunca torne banco, token ou secret público.
- Na Vercel, cole valores sem aspas extras.

### Variáveis críticas de Production

| Nome | Valor esperado | Secreta? | Obrigatória? |
| --- | --- | --- | --- |
| `DATABASE_URL` | URL Neon pooler com SSL | Sim | Sim |
| `DIRECT_URL` | URL direta Neon para migration | Sim | Fortemente recomendada |
| `AUTH_SECRET` | 48 bytes aleatórios ou mais | Sim | Sim |
| `AUTH_TRUST_HOST` | `true` | Não | Sim |
| `AUTH_SESSION_MAX_AGE_SECONDS` | `28800` | Não | Recomendada |
| `NEXT_PUBLIC_APP_URL` | domínio HTTPS final | Pública | Sim |
| `AUTH_URL` | mesmo domínio HTTPS | Não | Sim |
| `NEXTAUTH_URL` | mesmo domínio HTTPS | Não | Compatibilidade |
| `CRON_SECRET` | segredo diferente do Auth | Sim | Sim |
| `PAGBANK_ENVIRONMENT` | `sandbox` primeiro, depois `production` | Não | Sim |
| `PAGBANK_TOKEN` | token do ambiente escolhido | Sim | Sim para checkout |
| `PAGBANK_WEBHOOK_TOKEN` | segredo separado, se fornecido; senão usa `PAGBANK_TOKEN` | Sim | Opcional |
| `DATABASE_POOL_MAX` | `2` | Não | Recomendada |
| `XNUTRI_DEPLOYMENT` | `production` | Não | Recomendada |

### Upload e login opcional

| Nome | Uso |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Nome do ambiente Cloudinary |
| `CLOUDINARY_API_KEY` | Chave da API |
| `CLOUDINARY_API_SECRET` | Segredo da API |
| `CLOUDINARY_FOLDER` | `xnutri` em Production; `xnutri-preview` em Preview |
| `GOOGLE_CLIENT_ID` | Client ID OAuth Web |
| `GOOGLE_CLIENT_SECRET` | Client secret OAuth |

### Loja e PDV

```env
NEXT_PUBLIC_STORE_NAME=XNutri
NEXT_PUBLIC_STORE_CITY=Mirassol
NEXT_PUBLIC_STORE_STATE=SP
NEXT_PUBLIC_PDV_ENABLED=true
PDV_RECEIPT_FOOTER=Obrigado por comprar na XNutri Mirassol.
PDV_ALLOW_NEGATIVE_STOCK=false
PDV_CASHIER_MAX_DISCOUNT_PERCENT=10
```

`ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_NAME` servem só para scripts. Não precisam permanecer na Vercel.

## 7. Neon e Prisma

### Rotacionar a credencial já compartilhada

1. Entre no Neon e abra o projeto XNutri.
2. Redefina a senha/credencial do papel usado pela aplicação.
3. Copie novamente a URL pooler e a URL direta.
4. Atualize `DATABASE_URL` e `DIRECT_URL` na Vercel Production.
5. Configure Preview com outra branch/credencial.
6. Faça novo deploy e confirme `/api/health`.

Não reutilize nem publique a connection string antiga.

```env
DATABASE_URL=postgresql://USUARIO:SENHA@HOST-POOLER/BASE?sslmode=verify-full&channel_binding=require
DIRECT_URL=postgresql://USUARIO:SENHA@HOST-DIRETO/BASE?sslmode=verify-full&channel_binding=require
```

- `DATABASE_URL`: aplicação, com pooler.
- `DIRECT_URL`: migrations/administração, conexão direta.
- Ambas apontam ao mesmo banco dentro de cada ambiente.
- Preview e Production apontam a bancos/branches diferentes.
- Se o painel Neon ainda fornecer `sslmode=require`, a conexão é aceita pelo driver atual. Para evitar a mudança de semântica anunciada para o próximo major do `pg`, prefira `sslmode=verify-full` depois de testar em Preview.

Valide localmente:

```powershell
npm run db:validate
npm run db:status
```

O deploy executa `production:check`, `prisma generate`, `prisma migrate deploy` e `next build`.

Antes de migration em Production: backup, teste em Preview, revisão do SQL e plano de rollback. Nunca use `prisma migrate reset`, `db push --force-reset` ou seed em Production.

### Criar o dono no banco online

Depois das migrations, coloque temporariamente as URLs atualizadas do Neon em `.env.local` e rode:

```powershell
npm run admin:create -- "EMAIL_DO_DONO" "SENHA_FORTE_EXCLUSIVA" "Dono da XNutri"
```

O comando cria/atualiza apenas esse usuário como `ADMIN`; não apaga loja nem pedidos. Depois, restaure as URLs locais se voltar ao Docker.

## 8. Configurar a Vercel

O projeto está vinculado a `pedro-raduan/x-nutri-mirassol-novo`.

### Pelo painel

1. Abra o projeto XNutri na Vercel.
2. Acesse **Settings**.
3. Entre em **Environment Variables**. Se aparecer **Environments**, abra **Production** e a área de variáveis.
4. Clique em **Add Variable**.
5. Digite o nome exatamente como neste guia.
6. Cole o valor sem aspas.
7. Marque **Production** para credenciais reais.
8. Repita em **Preview** com banco, secrets e PagBank Sandbox separados.
9. Salve e faça **Redeploy**; deployment antigo não recebe variável nova.

### Pelo terminal

```powershell
npx vercel env ls
npx vercel env add CRON_SECRET production
npx vercel env add PAGBANK_ENVIRONMENT production
npx vercel env add PAGBANK_TOKEN production
npx vercel env add CLOUDINARY_CLOUD_NAME production
npx vercel env add CLOUDINARY_API_KEY production
npx vercel env add CLOUDINARY_API_SECRET production
```

Repita com `preview` e valores isolados:

```powershell
npx vercel env add AUTH_SECRET preview
npx vercel env add DATABASE_URL preview
npx vercel env add DIRECT_URL preview
npx vercel env add CRON_SECRET preview
npx vercel env add PAGBANK_ENVIRONMENT preview
npx vercel env add PAGBANK_TOKEN preview
```

Gere dois segredos diferentes, um para Auth e outro para Cron:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Conferência remota obrigatória

O código não consegue provar quais valores estão hoje no painel remoto. Confira em **Settings > Environments > Production** e em **Preview**. No histórico do projeto, banco e Auth já haviam sido adicionados; trate isso como informação a reconfirmar, não como validação atual.

Confirme especialmente:

- `CRON_SECRET`.
- `PAGBANK_ENVIRONMENT` e `PAGBANK_TOKEN`.
- `PAGBANK_WEBHOOK_TOKEN`, se houver segredo separado.
- As três credenciais `CLOUDINARY_*`.
- Google, se usar.
- Todas as variáveis de Preview.

Para Preview sem domínio estável, deixe as três URLs da aplicação ausentes e use a URL automática da Vercel. Para Google em Preview, crie domínio estável de branch e cadastre o callback exato. Nunca use banco Production no Preview.

## 9. PagBank

Novos pagamentos usam PagBank. As rotas antigas de Mercado Pago retornam `410` para impedir uso acidental.

### Sandbox

1. Crie/abra uma aplicação PagBank e obtenha o token Sandbox.
2. Configure no Preview:

```env
PAGBANK_ENVIRONMENT=sandbox
PAGBANK_TOKEN=TOKEN_SANDBOX
PAGBANK_WEBHOOK_TOKEN=SEGREDO_SEPARADO_SE_EXISTIR
```

3. Publique Preview.
4. Endpoint do webhook:

```text
https://SEU-DOMINIO/api/payments/pagbank/webhook
```

5. Faça pedido fictício e pague com dados Sandbox.
6. Confirme pagamento, pedido, estoque e auditoria.
7. Reenvie o mesmo evento e confirme que estoque não baixa duas vezes.

O webhook exige `x-authenticity-token`, valida corpo bruto, referência, BRL e total. O retorno do navegador nunca aprova pedido sozinho.

### Production

Depois do Sandbox:

1. Troque `PAGBANK_ENVIRONMENT=production` somente em Production.
2. Use token real.
3. Confirme webhook no domínio HTTPS.
4. Faça Redeploy.
5. Realize compra real pequena e confira gateway, pedido, estoque e auditoria.

Nunca use token Sandbox em Production nem armazene cartão/CVV.

## 10. Cloudinary

1. No Dashboard Cloudinary, copie Cloud Name, API Key e API Secret.
2. Adicione na Vercel:

```env
CLOUDINARY_CLOUD_NAME=SEU_CLOUD_NAME
CLOUDINARY_API_KEY=SUA_API_KEY
CLOUDINARY_API_SECRET=SEU_API_SECRET
CLOUDINARY_FOLDER=xnutri
```

3. Use `xnutri-preview` em Preview e faça Redeploy.
4. Entre no admin, envie imagem em produtos e banners.
5. Confirme URL `https://res.cloudinary.com/...`.

São aceitos JPG, PNG, WebP e AVIF de até 4 MB, com MIME e assinatura real conferidos. Nunca crie `NEXT_PUBLIC_CLOUDINARY_API_SECRET`.

## 11. Login Google

1. Google Cloud Console > APIs e serviços > Credenciais.
2. Configure tela de consentimento XNutri.
3. Crie **ID do cliente OAuth > Aplicativo da Web**.
4. Origens:

```text
http://localhost:3000
https://SEU-DOMINIO.com.br
```

5. Redirects:

```text
http://localhost:3000/api/auth/callback/google
https://SEU-DOMINIO.com.br/api/auth/callback/google
```

6. Configure `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` juntos e faça Redeploy.
7. Teste `/login` > **Continuar com Google**.

Somente e-mail Google verificado é aceito. Conta local existente com o mesmo e-mail não é vinculada silenciosamente; entre por senha até existir fluxo explícito de vínculo.

## 12. Frete, CEP e retirada

Hoje funciona assim:

- CEP: ViaCEP com BrasilAPI como alternativa.
- Checkout confere CEP, cidade e UF no servidor.
- Retirada: local cadastrado e frete zero.
- Entrega regional: cidades, preço, frete grátis e prazo do admin.
- Método chamado Correios: preço/prazo cadastrado, sem cotação oficial ao vivo.

Configuração:

1. Entre em `/admin/entregas`.
2. Cadastre/ative retirada com endereço e instruções reais.
3. Cadastre entrega regional, cidades, preço e prazo.
4. Desative métodos não usados.
5. Teste CEP atendido, não atendido, retirada e total do pedido.

`CORREIOS_*` pode ficar vazio até a API oficial ser implementada.

## 13. Admin, usuários e painel instalável

| Papel | Permissão atual |
| --- | --- |
| `ADMIN` | Dono: tudo, PDV e instalação do painel |
| `MANAGER` | Dashboard, produtos, estoque, pedidos e relatórios |
| `CASHIER` | Somente PDV |
| `VIEWER` | Leitura limitada |
| `CUSTOMER` | Próprios dados/pedidos |

Permissões críticas são verificadas no servidor.

Para instalar o painel:

1. Publique em HTTPS.
2. Entre em `/admin` como `ADMIN`.
3. Clique **Instalar painel**.
4. iPhone/iPad: Safari > Compartilhar > Adicionar à Tela de Início.

O PWA não guarda admin/dados de clientes offline. Copiar o ícone não libera acesso. Para revogar, desative o admin e troque a senha. Trocar `AUTH_SECRET` encerra todas as sessões.

## 14. Produtos, estoque, cupons e PDV

### Produtos

1. Cadastre categoria.
2. Cadastre nome, slug, preço, custo, SKU e foto real.
3. Cadastre variações quando necessárias.
4. Informe estoque e ative.
5. Confira catálogo, busca e página.

Sem estoque: não aparece nas vitrines principais, fica no fim da busca e mostra aviso vermelho.

### Estoque e pedido

- Pedido reserva estoque.
- Pagamento aprovado consome reserva e quantidade.
- Cancelamento/expiração libera reserva.
- Webhook repetido não baixa de novo.
- Cron cancela pendência antiga e libera estoque.

Teste o último item em dois navegadores.

### Cupons

Teste válido, inválido, expirado, limite, mínimo, frete grátis e desconto máximo. O servidor recalcula o pedido.

### PDV

1. Entre como `ADMIN` ou `CASHIER`.
2. Abra caixa.
3. Busque por nome/SKU/EAN/código.
4. Ajuste quantidade/desconto.
5. Teste dinheiro/troco, Pix, cartão e misto.
6. Finalize uma vez e aguarde.
7. Confira comprovante, estoque e relatório.
8. Teste cancelamento/devolução e feche caixa.

PagBank online não transforma automaticamente o terminal físico em maquininha.

## 15. Testes obrigatórios

Com Docker ligado:

```powershell
docker compose up -d
npm audit
npm run db:validate
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

E2E usa `xnutri_test`; nunca coloque Production em `TEST_DATABASE_URL`.

Última evidência detalhada, com data, quantidade e limitações, está em `docs/AUDITORIA_COMPLETA_2026-08-15.md`. Não substitua a validação do Preview e dos serviços externos por resultados locais.

Na rodada de 15/08/2026: audit com 0 vulnerabilidades conhecidas, Prisma/tipos/lint/build aprovados, 45/45 testes unitários/componentes e 33/33 execuções E2E aprovadas. Depois do último endurecimento do webhook, a suíte focal da loja também passou 9/9.

### Loja

- Home, busca, filtro e produto em desktop e 360 px.
- Com/sem estoque, variação e quantidade excessiva.
- Adicionar, comprar agora, alterar/remover carrinho.
- CEP válido/inválido, entrega/retirada.
- Cupom válido/inválido/expirado.
- Campos inválidos, duplo clique e atualização durante pagamento.
- Pedido salvo e acesso privado.

### Segurança e permissões

- Visitante/cliente não acessam admin/PDV/pedido alheio.
- Caixa não edita produto/financeiro.
- Gerente não acessa configuração crítica.
- Upload inválido/grande/sem permissão é recusado.
- Manipulação de preço, frete, desconto, role e status é recusada.
- Webhook inválido, divergente e repetido é tratado.

### Preview/Production

- `/api/health` conectado.
- Login/logout/sessão/Google.
- Admin, imagem, estoque, cupom e pedido.
- PDV completo.
- PagBank Sandbox e cron.
- HTTPS, headers e erros sem stack/segredo.
- Mobile sem rolagem lateral.

## 16. Publicar exclusivamente na Vercel

Antes:

1. Complete a seção 1.
2. Configure Production e Preview.
3. Faça backup.
4. Rode todos os testes.
5. Revise `git status` e envie ao GitHub.

```powershell
git status
git add .
git commit -m "prepare xnutri production"
git push
```

Não continue se aparecer `.env.local`, dump, chave ou arquivo desconhecido.

### Preview

1. Abra branch/PR.
2. Espere deployment.
3. Confira Build Logs.
4. Teste com dados fictícios.
5. Valide banco Preview, PagBank Sandbox e Cloudinary.

### Production

1. Faça merge.
2. Confira deployment/logs.
3. Abra `/api/health`.
4. Faça compra real pequena.
5. Confira PagBank, pedido, estoque e auditoria.
6. Monitore 5xx/webhook.

O `vercel.json` usa `npm ci`, `npm run vercel-build` e cron de 10 minutos. Se o plano não aceitar a frequência, ajuste cron e prazo de reserva juntos.

Rollback de código: Vercel > Deployments > anterior > Promote/Rollback. Banco exige migration/backup, nunca rollback cego.

## 17. Operação e incidentes

Semanalmente: pedidos pendentes, webhook, estoque, erros e auditoria. Mensalmente: backup/restore, usuários, tokens, custos e limites.

Em incidente:

1. Preserve logs.
2. Bloqueie usuário/integração.
3. Rotacione segredo no provedor e na Vercel.
4. Faça Redeploy.
5. Verifique banco, pedidos, estoque e pagamentos.
6. Documente causa/correção.

Nunca registre senha, cookie, token, connection string, cartão ou CVV.

## 18. Erros comuns

| Erro/sintoma | Correção |
| --- | --- |
| `DATABASE_URL não foi configurada` | Adicione no ambiente correto e faça Redeploy. |
| `AUTH_SECRET não foi configurada` | Gere 48 bytes aleatórios e faça Redeploy. |
| `CRON_SECRET não configurada` | Crie segredo diferente do Auth. |
| `PAGBANK_TOKEN não configurada` | Adicione token compatível com ambiente. |
| Variável continua ausente | Confira ambiente marcado e gere novo deployment. |
| `P1001` | Confira host, senha rotacionada, pooler, SSL e ambiente. |
| `P2021` | Confira `DIRECT_URL` e migrations. |
| Prisma Client falha | `npm ci`, `npm run db:generate`, tipos e build. |
| Admin volta ao login | Confira banco, `ADMIN` ativo, Auth, domínio e HTTPS. |
| Google não aparece | Configure ID e secret juntos, depois Redeploy. |
| `OAuthAccountNotLinked` | Conta já existe; entre por senha. |
| Upload `503` | Faltam três credenciais Cloudinary. |
| Upload `400/413` | Use imagem válida permitida de até 4 MB. |
| CEP/frete falha | Confira CEP, APIs, método ativo e cidades. |
| Webhook PagBank `401` | Confira autenticidade/token e corpo bruto. |
| Pagamento não atualiza | Confira ambiente, token, URL, referência, moeda/valor e logs. |
| Estoque fica reservado | Confira Cron, `CRON_SECRET` e logs. |
| E2E `ECONNREFUSED 5432` | Abra Docker e `docker compose up -d`. |
| Site usa localhost | Corrija as três URLs HTTPS e faça Redeploy. |

Diagnóstico:

```powershell
npx vercel env ls
npx vercel logs
npm run production:check
npm run db:status
```

## 19. Checklist antes de vender

- [ ] Neon rotacionado, Preview separado, backup e restore testados.
- [ ] Variáveis obrigatórias na Vercel e domínio HTTPS correto.
- [ ] MFA nos provedores e apenas dono com `ADMIN`.
- [ ] Nenhum segredo/dump no Git.
- [ ] Produtos, custos, imagens, estoque, endereço e políticas reais.
- [ ] Entrega, retirada, cupons, admin e PDV testados.
- [ ] Cloudinary aprovado.
- [ ] PagBank Sandbox/webhook/idempotência aprovados.
- [ ] Compra real pequena aprovada em Production.
- [ ] Cron libera reserva.
- [ ] Audit, Prisma, tipos, lint, unitários, E2E e build aprovados.
- [ ] Mobile 360 px, tablet e desktop aprovados.
- [ ] Preview aprovado antes de Production.

## 20. Ordem curta para terminar

```text
1. Rotacionar Neon e atualizar DATABASE_URL/DIRECT_URL.
2. Criar Neon Preview separado.
3. Adicionar CRON_SECRET e PagBank Sandbox.
4. Adicionar Cloudinary.
5. Configurar Google se quiser agora.
6. Rodar novamente todos os testes/E2E antes do commit final.
7. Criar dono com admin:create.
8. Cadastrar dados, produtos, estoque, retirada e frete reais.
9. Publicar/testar Preview.
10. Validar PagBank Sandbox, webhook e estoque.
11. Publicar Production.
12. Fazer compra real pequena e monitorar.
```

Os tutoriais antigos contraditórios foram removidos; este é o único passo a passo operacional. Os documentos em `docs/` descrevem arquitetura, regras, testes e auditoria, mas não substituem este guia. Segurança absoluta não existe: mantenha dependências, backups, permissões, logs e integrações sob revisão contínua.
