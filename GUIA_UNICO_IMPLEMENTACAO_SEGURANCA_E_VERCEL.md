# Guia único — XNutri, segurança e Vercel

> Fonte oficial de operação do projeto. Atualizado em 02/08/2026. A aplicação é publicada **somente na Vercel**; PostgreSQL, PagBank e Cloudinary são serviços externos necessários. Os guias antigos permanecem apenas como histórico e não devem orientar novos deploys.

## 1. Visão geral

XNutri é um e-commerce Next.js 16 com App Router, React 19, Auth.js, Prisma 7 e PostgreSQL. A loja pública oferece catálogo, carrinho, checkout, retirada e entrega. O painel `/admin` administra produtos, estoque, pedidos, cupons, frete e finanças; `/pdv` registra vendas presenciais. O pagamento online usa **Checkout hospedado PagBank**, assim cartão e PIX não passam pelo servidor XNutri.

Perfis internos são `ADMIN`, `MANAGER`, `CASHIER` e `VIEWER`, armazenados em `AdminUser`; usuários comuns têm `UserRole.CLIENT`. O campo `UserRole.ADMIN` identifica funcionários elegíveis e a autorização detalhada é feita no servidor pela matriz em `src/lib/auth/permissions.ts`.

Fluxo de pedido: carrinho → validação do checkout no servidor → preço/frete/cupom/estoque recalculados → pedido e reserva atômica → Checkout PagBank → webhook assinado → pedido pago e baixa de estoque. Cada pedido de visitante recebe URL com token opaco; somente o hash fica no banco.

## 2. Pré-requisitos

- Node.js compatível com `package.json` (20.19+, 22.12+ ou 24+).
- npm 10+.
- Docker Desktop apenas para desenvolvimento local com PostgreSQL.
- Conta Vercel, repositório Git, PostgreSQL gerenciado (ex.: Neon), PagBank e Cloudinary.
- Para Google OAuth: projeto no Google Cloud.

## 3. Instalação local

```powershell
Copy-Item .env.example .env.local
npm ci
docker compose up -d
npm run db:deploy
npm run db:seed
npm run dev
```

Abra `http://localhost:3000`. Nunca aponte `DATABASE_URL` local para a base de produção. Para preparar testes E2E, o Docker precisa estar iniciado e a porta 5432 disponível:

```powershell
npm run test:db:reset
npm run test:e2e
```

## 4. Variáveis de ambiente

Configure valores reais em `.env.local` somente na máquina local e em **Vercel > Project > Settings > Environment Variables** nos ambientes Preview e Production. Nunca use `NEXT_PUBLIC_` para segredo.

| Variável | Finalidade | Ambiente | Tipo |
| --- | --- | --- | --- |
| `DATABASE_URL` | URL pooler do PostgreSQL usada pela aplicação | Preview/Production | segredo |
| `DIRECT_URL` | URL direta usada por Prisma migrations | Preview/Production | segredo |
| `NEXT_PUBLIC_APP_URL` | URL HTTPS canônica | Production; Preview se necessário | pública |
| `AUTH_URL`, `NEXTAUTH_URL` | URL base do Auth.js, igual à URL pública | Production | pública de configuração |
| `AUTH_SECRET` | Assinatura de sessão Auth.js | todos | segredo |
| `AUTH_SESSION_MAX_AGE_SECONDS` | 900–86400; padrão 28800 | todos | configuração |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth Google, sempre juntos | quando OAuth ativo | ID/configuração e segredo |
| `PAGBANK_ENVIRONMENT` | `sandbox` ou `production` | todos | configuração |
| `PAGBANK_TOKEN` | Token da API Checkout PagBank | quando pagamento ativo | segredo |
| `PAGBANK_WEBHOOK_TOKEN` | Token de autenticidade das notificações | PagBank ativo | segredo |
| `CRON_SECRET` | Protege Vercel Cron de reservas expiradas | Production | segredo |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Upload de imagens | quando upload ativo | segredo, exceto nome |
| `CORREIOS_*` | Integração futura de frete | somente se utilizada | segredo |

Gere cada segredo no PowerShell e use um valor diferente por ambiente:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Ao expor um segredo em chat, terminal, Git ou log, revogue-o no fornecedor e substitua-o na Vercel. Não cole o valor antigo em chamados ou documentação.

## 5. Banco e Prisma

Desenvolvimento usa o `docker-compose.yml`; produção usa PostgreSQL gerenciado. O deploy Vercel roda `npm run vercel-build`, que valida ambiente, gera o client e executa `prisma migrate deploy` antes de `next build`.

```powershell
npm run db:validate
npm run db:generate
npm run db:status
npm run db:deploy
npm run db:seed
npm run admin:create -- "admin@dominio.com" "Use-uma-senha-longa"
```

Antes de migration em Production: faça backup no provedor, teste em Preview com banco separado e leia a migration. Nunca use `prisma migrate reset` em produção. O banco deve ter backup automático e restore testado no painel do provedor.

## 6. Autenticação, usuários e permissões

- Senhas usam bcrypt; jamais armazene ou envie senha em texto puro.
- Credenciais usam limite por IP/e-mail e resposta genérica para reduzir enumeração.
- Cookies Auth.js são seguros em produção e a sessão dura no máximo 24 h.
- Mutação autenticada verifica origem e autorização no servidor.
- Google exige e-mail verificado. Vínculo automático perigoso por e-mail foi desativado: uma conta já existente não é duplicada nem vinculada silenciosamente.
- `ADMIN` pode tudo; `MANAGER` atua em produtos, estoque e pedidos; `CASHIER` só PDV; `VIEWER` apenas leitura definida; cliente só os próprios dados/pedidos.

MFA é uma configuração externa obrigatória para contas Vercel, Git, banco, PagBank, Cloudinary e Google. O projeto ainda não possui MFA próprio para o login administrativo; use senha exclusiva e revise logs de auditoria até uma segunda camada ser implementada.

## 7. Produtos, estoque, pedidos e cupons

Preço, desconto, cupom, frete e total são recalculados no servidor. O cliente nunca fornece o valor confiável. Ao criar pedido, a quantidade fica em `reserved`; a confirmação PagBank reduz `quantity` e remove a reserva. Cancelamento pendente libera a reserva; reembolso de pedido pago devolve unidades. Movimentos são idempotentes por índices do banco.

`/api/cron/release-expired-orders` cancela reservas pendentes depois de 30 minutos. É chamado a cada 10 minutos por `vercel.json` e exige `CRON_SECRET`. Confirme se o plano Vercel permite a frequência configurada; se não permitir, ajuste cron e prazo juntos, antes de ativar pagamentos.

## 8. PagBank

1. No painel PagBank, obtenha token de Sandbox primeiro e configure `PAGBANK_ENVIRONMENT=sandbox`, `PAGBANK_TOKEN` e `PAGBANK_WEBHOOK_TOKEN`.
2. Publique um Preview com domínio HTTPS.
3. Cadastre a notificação: `https://SEU-DOMINIO/api/payments/pagbank/webhook`.
4. Faça pedido fictício. O retorno do navegador não confirma pagamento; somente webhook com `x-authenticity-token` válido, referência, moeda BRL e total coincidente pode aprovar.
5. Confira em `/admin/auditoria` e estoque. Reenvie o mesmo webhook: ele deve ser idempotente.
6. Somente depois crie/ative token de produção e altere `PAGBANK_ENVIRONMENT=production` em Production.

Não armazene cartão, CVV ou token de cartão. As rotas antigas de Mercado Pago retornam 410 somente para impedir uso acidental; registros históricos com esse provedor foram preservados.

## 9. Cloudinary e uploads

Crie pasta `xnutri` (ou valor de `CLOUDINARY_FOLDER`) e informe credenciais na Vercel. Upload é permitido apenas a perfil interno autorizado, mesma origem, JPG/PNG/WebP/AVIF, no máximo 4 MB e assinatura real do arquivo conferida no servidor. Teste criar produto, enviar imagem do computador, salvar e conferir URL HTTPS.

## 10. Deploy exclusivamente na Vercel

1. Importe o repositório em [Vercel](https://vercel.com/new) como Next.js.
2. Mantenha `installCommand` `npm ci` e `buildCommand` `npm run vercel-build` de `vercel.json`.
3. Cadastre todas as variáveis obrigatórias em Preview e Production, com banco separado ou permissões separadas.
4. Faça commit/push; valide o Preview: home, login, admin, checkout sandbox, upload e headers.
5. Somente então promova para Production e associe domínio HTTPS.
6. Use Deployments para logs e rollback para a versão anterior. Não execute rollback de banco sem migration reversível e backup.

Ative Vercel Firewall/Bot Protection, Analytics, Speed Insights, proteção de Preview e alertas de erro no painel quando disponíveis no plano. A aplicação não depende de disco local persistente, processo sempre aberto ou sessão em memória; o rate limit local é complementar e não substitui WAF/rate limit distribuído.

## 11. Segurança e operação

Implementado: validação Zod, autenticação/autorizações de servidor, proteção de origem, hash de senha, headers, webhook assinado e idempotente, upload validado, logs de auditoria, erros amigáveis e dependências auditadas. A CSP ainda usa `unsafe-inline` para manter estilos/scripts do framework; não a remova/aperte sem validar Login Google, PagBank, imagens e checkout.

Monitore: falhas de login, recusas PagBank, pedidos pendentes, estoque baixo, alterações de preço/estoque e erros 5xx. Logs não devem receber senhas, cookies, tokens, CVV ou URL completa de banco. Para incidente: revogue segredo, bloqueie conta, preserve evidência mínima, restaure backup em ambiente isolado e documente o ocorrido em `docs/RESPOSTA_A_INCIDENTES.md`.

## 12. Testes

```powershell
npm audit
npm run db:validate
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

Teste manual obrigatório em Preview: visitante, cliente próprio e cliente alheio; ADMIN/MANAGER/CASHIER/VIEWER; add/remover carrinho; CEP/frete; retirada; cupom; pagamento sandbox; webhook repetido/inválido; upload inválido; pedido simultâneo do último item; telas 360 px, tablet e desktop. Use dados fictícios.

## 13. Erros comuns

| Sintoma | Diagnóstico e correção |
| --- | --- |
| `DATABASE_URL não configurada` | Cadastre a variável no ambiente correto da Vercel e faça novo deploy. |
| `AUTH_SECRET não configurada` | Gere segredo de 32+ caracteres, cadastre e redeploy. |
| `P1001` | Confirme URL/pooler, SSL, região e acesso do banco. |
| `P2021` | Execute `npm run db:deploy` com `DIRECT_URL` correto. |
| Checkout não abre | Confira `PAGBANK_TOKEN`, ambiente e logs da rota PagBank. |
| Webhook 401 | Refaça `PAGBANK_WEBHOOK_TOKEN`; corpo e assinatura não podem ser alterados. |
| Pedido pendente expira | Verifique `CRON_SECRET`, cron Vercel e o plano. |
| Upload falha | Confirme três variáveis Cloudinary, papel do usuário, tipo e 4 MB. |
| Admin redireciona para domínio errado | Não deixe `AUTH_URL` de produção no `.env.local`; redirecionamentos internos são relativos. |

## 14. Checklist de Production

- [ ] Preview aprovado e logs sem erro crítico.
- [ ] Banco online, backup e restore verificados.
- [ ] Migrations aplicadas e primeiro ADMIN criado.
- [ ] `AUTH_SECRET`, `CRON_SECRET`, URLs e tokens por ambiente configurados.
- [ ] PagBank sandbox, webhook assinado e idempotência testados.
- [ ] Cloudinary testado.
- [ ] Cron de liberação de reserva confirmado.
- [ ] Firewall/bot protection, MFA dos provedores e monitoramento configurados.
- [ ] `npm audit`, tipos, lint, unitários, E2E e build aprovados.
- [ ] Nenhuma URL local, segredo ou dado real de teste foi publicado.
