# OBSOLETO — consulte [o guia único](../GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md).

# Tutorial XNutri consolidado

Este arquivo junta, limpa e organiza os tutoriais da XNutri em um único guia. A ideia é seguir uma ordem prática: **rodar localmente → conectar banco → configurar integrações → testar admin/PDV/checkout → revisar segurança → publicar em produção**.

---

## 1. Visão geral do projeto

A XNutri é uma loja em Next.js com:

- loja pública;
- catálogo;
- carrinho;
- checkout;
- conta do cliente;
- painel administrativo;
- PDV presencial;
- estoque integrado;
- pagamentos via Mercado Pago;
- upload de imagens via Cloudinary;
- banco PostgreSQL com Prisma;
- autenticação com Auth.js;
- opção de login com Google;
- deploy em Vercel ou Hostinger.

Arquitetura recomendada:

```text
Cliente
  |
  v
Next.js em produção
  |-- loja pública
  |-- admin
  |-- PDV
  |-- APIs internas
  |
  +--> Neon PostgreSQL
  +--> Mercado Pago
  +--> Cloudinary
  +--> Google OAuth, opcional
```

No desenvolvimento local, o PostgreSQL pode rodar pelo Docker. Em produção, **não use Docker local como banco**. Use Neon, Supabase, Railway, Render, RDS ou outro PostgreSQL online.

---

## 2. Requisitos

Instale antes de começar:

- Node.js 22 ou superior;
- npm;
- Docker Desktop, se for usar PostgreSQL local;
- Git;
- conta no Cloudinary, para imagens;
- conta no Mercado Pago, para pagamentos;
- banco PostgreSQL online, como Neon, para produção;
- conta na Vercel ou Hostinger para publicar.

Confira no PowerShell:

```powershell
node -v
npm -v
docker --version
git --version
```

Se `docker --version` falhar, abra o Docker Desktop ou instale antes de continuar.

---

## 3. Arquivos importantes

| Parte | Arquivo ou pasta |
| --- | --- |
| Variáveis de ambiente locais | `.env.local` |
| Modelo de variáveis | `.env.example` |
| Variáveis de produção modelo | `.env.production.example` |
| Scripts do projeto | `package.json` |
| Banco local Docker | `docker-compose.yml` |
| Schema do banco | `prisma/schema.prisma` |
| Migrations | `prisma/migrations/` |
| Seed/dados iniciais | `prisma/seed.ts` |
| Criar admin | `scripts/create-admin.ts` |
| Prisma config | `prisma.config.ts` |
| Loja pública | `src/app/(site)/` |
| Carrinho e checkout | `src/app/(site)/(shop)/` |
| Admin | `src/app/admin/` |
| PDV | `src/app/pdv/` |
| Ações admin | `src/lib/actions/admin.ts` |
| Ações checkout | `src/lib/actions/checkout.ts` |
| Pedidos | `src/lib/ecommerce/orders.ts` |
| Estoque | `src/lib/ecommerce/inventory.ts` |
| Mercado Pago | `src/lib/payments/mercado-pago.ts` |
| Webhook Mercado Pago | `src/app/api/payments/mercado-pago/webhook/route.ts` |
| Upload Cloudinary | `src/app/api/admin/uploads/cloudinary/route.ts` |
| Configuração Cloudinary | `src/lib/cloudinary.ts` |
| Frete | `src/lib/shipping/quote.ts` |
| API de frete | `src/app/api/shipping/quote/route.ts` |
| API de CEP | `src/app/api/cep/[cep]/route.ts` |

---

## 4. Ordem certa para fazer tudo

Siga esta ordem. Não pule etapas, porque muitos erros vêm de tentar publicar antes de testar o básico.

```text
1. Abrir a pasta do projeto
2. Instalar dependências
3. Criar .env.local
4. Rodar banco local
5. Rodar Prisma
6. Rodar seed em desenvolvimento
7. Criar admin
8. Rodar site local
9. Testar loja, admin, PDV e checkout
10. Configurar Cloudinary
11. Configurar Mercado Pago em sandbox
12. Configurar Google OAuth, se quiser
13. Rodar lint, typecheck e build
14. Preparar banco online
15. Configurar variáveis de produção
16. Publicar na Vercel ou Hostinger
17. Testar produção
18. Só depois ativar Mercado Pago produção
```

---

## 5. Abrir a pasta do projeto

No PowerShell:

```powershell
cd "C:\Users\Sharif\Downloads\xnutri"
```

Confira se está na pasta certa:

```powershell
Get-ChildItem
```

Você precisa ver arquivos como:

```text
package.json
docker-compose.yml
.env.example
prisma
src
docs
```

---

## 6. Instalar dependências

Use:

```powershell
npm install
```

Se der erro de dependência, tente:

```powershell
npm install --legacy-peer-deps
```

Depois gere o Prisma Client:

```powershell
npm run db:generate
```

Se aparecer erro dizendo que `PrismaClient` não existe, rode:

```powershell
npm run db:generate
npm run build
```

Os imports corretos continuam sendo:

```ts
import { PrismaClient, UserRole } from "@prisma/client";
```

---

## 7. Criar e configurar `.env.local`

Crie copiando o exemplo:

```powershell
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
```

Gere um `AUTH_SECRET` seguro:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Configuração mínima local com Docker:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=COLE_A_CHAVE_GERADA_AQUI
AUTH_TRUST_HOST=true

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xnutri?schema=public
DIRECT_URL=
DATABASE_POOL_MAX=5
PRISMA_LOG_ERRORS=false

NEXT_PUBLIC_STORE_NAME=XNutri
NEXT_PUBLIC_STORE_CITY=Mirassol
NEXT_PUBLIC_STORE_STATE=SP

NEXT_PUBLIC_PDV_ENABLED=true
PDV_RECEIPT_FOOTER=Obrigado pela compra. Este comprovante nao substitui documento fiscal.
PDV_ALLOW_NEGATIVE_STOCK=false
PDV_CASHIER_MAX_DISCOUNT_PERCENT=10

NEXT_PUBLIC_PWA_NAME=XNutri PDV
NEXT_PUBLIC_PWA_SHORT_NAME=XNutri
```

Nunca envie `.env.local`, `.env`, `.env.hostinger` ou arquivos com senhas para o GitHub.

---

## 8. Rodar PostgreSQL local com Docker

Ligue o banco:

```powershell
docker compose up -d
```

Confira:

```powershell
docker compose ps
```

Se quiser ver logs:

```powershell
docker logs xnutri-postgres --tail 50
```

Dados locais esperados:

```text
Host: localhost
Porta: 5432
Banco: xnutri
Usuário: postgres
Senha: postgres
```

A variável local precisa bater com isso:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xnutri?schema=public
```

---

## 9. Preparar Prisma, banco e seed

Gere o client:

```powershell
npm run db:generate
```

Aplique as migrations:

```powershell
npm run db:deploy
```

Em desenvolvimento, se precisar criar migration nova:

```powershell
npm run db:migrate
```

Coloque dados iniciais:

```powershell
npm run db:seed
```

Abrir banco visualmente:

```powershell
npm run db:studio
```

Atenção: o seed é para ambiente local/teste/base inicial. **Não rode seed em produção com clientes, pedidos ou vendas reais**, porque ele pode recriar dados de demonstração dependendo da configuração.

---

## 10. Criar ou trocar administrador

Se o seed criou contas de teste, use apenas localmente. Exemplos comuns de teste:

```text
Admin: admin@xnutri.com.br / Admin@12345
Caixa: caixa@xnutri.com.br / Caixa@12345
Cliente: cliente@xnutri.com.br / Cliente@12345
```

Em produção, crie um administrador real:

```powershell
npm run admin:create -- novo-admin@seudominio.com "SenhaForte@123" "Nome do Administrador"
```

Ou usando variáveis temporárias:

```powershell
$env:ADMIN_EMAIL="seu-email@dominio.com"
$env:ADMIN_PASSWORD="COLOQUE_UMA_SENHA_FORTE"
$env:ADMIN_NAME="Administrador XNutri"
npm run admin:create
```

Depois limpe:

```powershell
Remove-Item Env:ADMIN_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:ADMIN_NAME -ErrorAction SilentlyContinue
```

---

## 11. Rodar o site localmente

Inicie:

```powershell
npm run dev
```

Abra:

```text
Loja:      http://localhost:3000
Catálogo:  http://localhost:3000/catalogo
Carrinho:  http://localhost:3000/carrinho
Checkout:  http://localhost:3000/checkout
Admin:     http://localhost:3000/admin
PDV:       http://localhost:3000/pdv
```

Se a porta 3000 estiver ocupada:

```powershell
netstat -ano | findstr :3000
```

Mate o processo pelo PID:

```powershell
Stop-Process -Id NUMERO_DO_PID -Force
```

---

## 12. Testar loja, carrinho e checkout localmente

Com o site aberto:

1. Entre em `/catalogo`.
2. Abra um produto.
3. Escolha variação, se houver.
4. Adicione ao carrinho.
5. Vá para `/carrinho`.
6. Digite um CEP.
7. Escolha frete ou retirada.
8. Vá para `/checkout`.
9. Preencha os dados do cliente.
10. Finalize o pedido.
11. Confira se criou pedido no banco/admin.

Arquivos principais:

```text
src/app/(site)/(shop)/carrinho/page.tsx
src/app/(site)/(shop)/checkout/page.tsx
src/components/cart/
src/components/checkout/
src/lib/actions/cart.ts
src/lib/actions/checkout.ts
src/lib/ecommerce/orders.ts
```

Se der erro:

```powershell
docker compose ps
npm run db:deploy
npm run db:generate
npm run dev
```

---

## 13. Conectar Cloudinary

O Cloudinary guarda imagens de produtos e banners.

### 13.1 Onde colocar as chaves

Abra:

```powershell
notepad .env.local
```

Adicione:

```env
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
CLOUDINARY_FOLDER=xnutri
```

Nunca faça isto:

```env
NEXT_PUBLIC_CLOUDINARY_API_SECRET=...
```

O `CLOUDINARY_API_SECRET` é segredo do servidor. Não pode ir para o navegador.

### 13.2 Onde achar os dados

No Cloudinary:

1. Faça login.
2. Abra o dashboard.
3. Vá na área de credenciais/API keys.
4. Copie:
   - Cloud name;
   - API key;
   - API secret.

### 13.3 Testar

Reinicie o servidor:

```powershell
Ctrl + C
npm run dev
```

Teste:

1. Entre em `/admin`.
2. Vá para `Banners e home`.
3. Envie uma imagem.
4. Salve.
5. Veja se a home mostra a imagem.
6. Vá também em `Admin > Produtos` e teste imagem de produto.

A URL gerada deve começar com:

```text
https://res.cloudinary.com/...
```

### 13.4 Erros comuns

**Upload falhou**

Confira:

```env
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Depois reinicie o servidor.

**Erro 401 / Unauthorized**

Provável chave errada ou usuário sem permissão no admin.

**Imagem não aparece**

Verifique se a URL é HTTPS e se foi salva no produto/banner.

---

## 14. Conectar Mercado Pago

O projeto usa Mercado Pago Checkout Pro.

Fluxo esperado:

```text
Cliente finaliza checkout
  ↓
Sistema cria pedido
  ↓
Sistema cria preferência no Mercado Pago
  ↓
Cliente paga
  ↓
Mercado Pago chama webhook
  ↓
Sistema valida assinatura, valor, moeda e pedido
  ↓
Pedido vira PAID
  ↓
Estoque baixa automaticamente
```

### 14.1 Arquivos envolvidos

```text
src/lib/payments/mercado-pago.ts
src/app/api/payments/mercado-pago/preference/route.ts
src/app/api/payments/mercado-pago/webhook/route.ts
src/lib/actions/checkout.ts
src/lib/ecommerce/orders.ts
src/lib/ecommerce/inventory.ts
```

### 14.2 Variáveis locais

No `.env.local`:

```env
MERCADO_PAGO_ENVIRONMENT=sandbox
MERCADO_PAGO_ACCESS_TOKEN=TEST-ou-APP_USR-seu-access-token
MERCADO_PAGO_PUBLIC_KEY=sua-public-key
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=sua-public-key
MERCADO_PAGO_WEBHOOK_SECRET=seu-segredo-do-webhook
```

Reinicie:

```powershell
npm run dev
```

### 14.3 Webhook

Quando tiver domínio público, cadastre no painel do Mercado Pago:

```text
https://seu-dominio.com.br/api/payments/mercado-pago/webhook
```

Evento:

```text
payment
```

Em localhost, o Mercado Pago não chama `http://localhost:3000`. Para testar webhook local, use um túnel público, como ngrok ou equivalente.

### 14.4 Status usados

Pedidos:

```text
PENDING
PAID
PREPARING
SHIPPED
DELIVERED
CANCELED
```

Pagamentos:

```text
PENDING
APPROVED
REJECTED
REFUNDED
CANCELED
```

### 14.5 Testar

1. Use credenciais sandbox.
2. Faça um pedido pequeno.
3. Pague com usuário/cartão de teste.
4. Veja se o pedido atualiza.
5. Confira estoque.
6. Confira logs/auditoria.
7. Só depois mude para produção.

### 14.6 Importante de segurança

O navegador nunca deve decidir preço, status ou valor aprovado. O servidor recalcula o pedido, consulta o Mercado Pago e compara:

- referência externa;
- valor;
- moeda;
- status;
- assinatura do webhook.

---

## 15. Login com Google OAuth

O login com Google é opcional. O login por e-mail e senha continua funcionando.

### 15.1 Criar credenciais

No Google Cloud Console:

1. Crie ou selecione projeto.
2. Configure a tela de consentimento OAuth com nome XNutri.
3. Vá em Credenciais.
4. Crie `ID do cliente OAuth`.
5. Selecione `Aplicativo da Web`.
6. Adicione os redirects:

```text
http://localhost:3000/api/auth/callback/google
https://SEU-DOMINIO.com.br/api/auth/callback/google
```

### 15.2 Variáveis

No `.env.local`:

```env
GOOGLE_CLIENT_ID=cole-o-client-id
GOOGLE_CLIENT_SECRET=cole-o-client-secret
```

Em produção, coloque as mesmas variáveis no painel da hospedagem.

Também confira:

```env
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO.com.br
AUTH_URL=https://SEU-DOMINIO.com.br
NEXTAUTH_URL=https://SEU-DOMINIO.com.br
```

### 15.3 Como funciona

- Usuário novo vira cliente.
- Se já existir usuário com mesmo e-mail, o Google é vinculado à conta existente.
- O login exige `email_verified=true`.
- `GOOGLE_CLIENT_SECRET` nunca vai para o navegador.

### 15.4 Teste

1. Abra `/login`.
2. Clique em `Continuar com Google`.
3. Autorize.
4. Confirme redirecionamento para `/cliente`.
5. Verifique no banco se não duplicou usuário.

---

## 16. Frete, CEP e retirada na loja

O sistema tem:

- API de CEP;
- cotação de frete;
- retirada na loja;
- regras de entrega configuráveis.

Arquivos:

```text
src/lib/shipping/quote.ts
src/app/api/shipping/quote/route.ts
src/app/api/cep/[cep]/route.ts
```

Teste:

1. Vá ao carrinho.
2. Digite um CEP real.
3. Veja se aparece frete.
4. Se retirada estiver ativa, confirme frete zero.
5. Finalize pedido com retirada.
6. Confira no admin se o pedido registra a escolha certa.

Se o CEP falhar, teste outro CEP real e veja logs do servidor.

---

## 17. Admin: produtos, banners, estoque e pedidos

### 17.1 Produtos

Acesse:

```text
/admin/produtos
```

Preencha:

- categoria;
- nome;
- SKU;
- descrição;
- preço;
- estoque inicial;
- imagem;
- destaque;
- promoção;
- mais vendido, se aplicável.

Campos importantes:

| Campo | Uso |
| --- | --- |
| `name` | nome comercial |
| `slug` | gerado automaticamente |
| `sku` | identificador único |
| `price` | preço de venda |
| `compareAtPrice` | preço riscado |
| `stock` | estoque inicial |
| `imageUrl` | imagem por URL ou Cloudinary |

Exemplo de SKU:

```text
XN-WHEY-CHOC-900
XN-WHEY-MOR-900
XN-LEGGING-PRETA-M
```

Se editar pelo seed:

```text
prisma/seed.ts
```

Depois:

```powershell
npm run db:seed
```

Use seed apenas em desenvolvimento.

### 17.2 Banners

Acesse:

```text
/admin/banners
```

Cadastre:

- título;
- subtítulo;
- imagem;
- CTA;
- localização.

Locais possíveis:

```text
HOME_HERO
HOME_PROMO
CATALOG
```

Em produção, use imagem segura do Cloudinary:

```text
https://res.cloudinary.com/...
```

### 17.3 Estoque

Estrutura:

```text
inventory: saldo atual por produto/variação
inventory_movements: histórico de entradas, saídas, reservas, liberações e ajustes
```

Ajuste manual:

1. Acesse `/admin/estoque`.
2. Informe novo saldo.
3. Escreva o motivo.
4. Salve.

O sistema registra:

- saldo anterior;
- novo saldo;
- responsável;
- motivo;
- data.

Baixa automática:

- venda online paga baixa estoque;
- venda PDV finalizada baixa estoque;
- movimentação `STOCK_OUT` é registrada.

Itens abaixo do limite aparecem como estoque baixo no dashboard.

### 17.4 Pedidos

Use o admin para conferir:

- pedidos pendentes;
- pedidos pagos;
- status de entrega;
- método de pagamento;
- retirada/frete;
- cliente;
- itens;
- valor total.

---

## 18. PDV presencial

O PDV fica em:

```text
/pdv
/pdv/login
/pdv/relatorios
```

O PDV e o e-commerce usam o mesmo banco. Então:

- produto cadastrado no admin aparece no site e no PDV;
- venda no PDV baixa estoque do site;
- venda online baixa estoque do PDV;
- relatórios, custos e auditoria ficam centralizados.

### 18.1 Permissões recomendadas

Use como regra principal a política atual de segurança do projeto:

| Perfil | Acesso recomendado |
| --- | --- |
| `ADMIN` | tudo |
| `MANAGER` | dashboard, produtos, estoque, pedidos e relatórios |
| `CASHIER` | PDV |
| `CUSTOMER` | área do cliente |

Observação: alguns guias antigos citavam `MANAGER` também no PDV. Se quiser isso, confirme a regra no código atual antes de liberar.

### 18.2 Abrir caixa

1. Entre em `/pdv`.
2. Informe o valor inicial em dinheiro.
3. Clique em `Abrir caixa`.

Sem caixa aberto, o sistema não deve finalizar venda real.

### 18.3 Fazer venda

1. Busque ou escaneie o produto.
2. Ajuste quantidade.
3. Aplique desconto por item, se necessário.
4. Aplique desconto geral, se necessário.
5. Escolha cliente ou venda sem cliente.
6. Escolha pagamento.
7. Finalize venda.

Atalhos úteis:

```text
F2: buscar produto
F4: desconto geral
F8: finalizar venda
Esc: limpar busca ou fechar aviso
```

### 18.4 Leitor de código de barras

Leitor comum funciona como teclado.

No PDV:

1. Clique no campo de busca.
2. Escaneie.
3. Se bater com SKU, barcode, EAN ou código interno, entra no carrinho.

### 18.5 Pagamentos no PDV

Formas:

- dinheiro;
- Pix;
- cartão de débito;
- cartão de crédito;
- Mercado Pago;
- pagamento misto.

Pagamento misto:

```text
Total: R$ 200,00
Pix: R$ 100,00
Crédito: R$ 100,00
```

Para dinheiro, informe valor recebido e o PDV calcula troco.

### 18.6 Estoque no PDV

Ao finalizar venda:

- estoque baixa;
- movimento `STOCK_OUT` é registrado;
- produto pode ficar indisponível se zerar;
- admin vê o mesmo saldo.

Se não tiver estoque, o PDV bloqueia a venda, a menos que estoque negativo esteja permitido nas configurações.

### 18.7 Comprovante

O comprovante mostra:

- loja;
- data;
- número da venda;
- funcionário;
- cliente;
- produtos;
- quantidade;
- preço;
- desconto;
- total;
- forma de pagamento;
- troco.

Opções:

- imprimir;
- salvar como PDF pelo navegador;
- enviar resumo por WhatsApp;
- enviar por e-mail, se houver e-mail do cliente.

### 18.8 Cancelamento, devolução e caixa

Cancelamento total:

1. Abra últimas vendas.
2. Clique em cancelar.
3. Informe motivo.
4. Confirme.
5. Estoque volta.

Fechar caixa:

1. Confira vendas.
2. Confira sangrias/reforços.
3. Informe valor final.
4. Feche o caixa.
5. Revise diferença, se houver.

---

## 19. Segurança antes de produção

O projeto já tem proteções importantes:

- Auth.js com cookies seguros em produção;
- sessão com duração configurável;
- proteção de origem nas mutações;
- rate limit em login, cadastro, checkout, CEP, frete, upload, webhook e PDV;
- controle de acesso no servidor;
- checkout recalculando preço, desconto, frete e total no servidor;
- Mercado Pago validando webhook e conferindo valor/moeda/pedido;
- upload limitado a imagens reais;
- limite de tamanho de arquivo;
- headers de segurança;
- auditoria administrativa;
- erros técnicos ocultados do cliente;
- dependências auditadas.

Mas ainda existem ações obrigatórias antes de aceitar dinheiro real.

### 19.1 Ações manuais obrigatórias

Antes de produção:

1. Rotacionar qualquer senha de banco já compartilhada em chat, print ou arquivo.
2. Configurar `MERCADO_PAGO_WEBHOOK_SECRET`.
3. Confirmar `AUTH_SECRET` forte e exclusivo de produção.
4. Usar HTTPS no domínio.
5. Configurar backup e restauração no banco.
6. Testar restauração do backup.
7. Configurar monitoramento e alertas.
8. Revisar permissões do usuário PostgreSQL.
9. Decidir estratégia de reserva de estoque para evitar compra concorrente.
10. Usar rate limit distribuído, como Redis/Upstash, se tiver várias instâncias.
11. Trocar todas as senhas de teste.
12. Ativar MFA nos painéis: GitHub, Vercel/Hostinger, Neon, Mercado Pago, Cloudinary e Google.

### 19.2 Atenção ao estoque concorrente

Risco principal: dois clientes podem pagar quase ao mesmo tempo um item com pouco estoque. Se o estoque só baixa após aprovação, um pagamento pode ser aprovado e depois o sistema perceber que acabou.

Soluções possíveis:

- reservar estoque ao criar pedido, com expiração;
- baixar antes do pagamento e devolver se falhar/cancelar;
- manter estoque maior que demanda;
- bloquear compra se quantidade disponível for crítica;
- revisar fluxo de webhook e idempotência.

Para loja real, a melhor opção é implementar reserva atômica com expiração.

### 19.3 O que nunca fazer

- Não colocar segredo com `NEXT_PUBLIC_`.
- Não usar banco Docker/local em produção.
- Não enviar `.env.local` ao GitHub.
- Não usar senha de teste em produção.
- Não confiar em preço vindo do navegador.
- Não aceitar pagamento real sem webhook validado.
- Não rodar seed em banco com vendas reais.
- Não ignorar logs de erro no deploy.

---

## 20. Testes obrigatórios antes de publicar

Rode localmente:

```powershell
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=high
```

Se tiver suíte de testes configurada:

```powershell
npm test
```

Se tiver Playwright:

```powershell
npx playwright test
```

O relatório de QA anterior indicou aprovação em:

- testes unitários;
- testes E2E;
- responsividade;
- ESLint;
- TypeScript;
- Prisma validate;
- migrations;
- build de produção;
- audit sem vulnerabilidades altas;
- smoke test;
- `/api/health`.

Mesmo assim, rode de novo antes do deploy final.

### 20.1 Checklist manual da loja

- Home abre.
- Catálogo abre.
- Produto abre.
- Imagem aparece.
- Produto esgotado não vende.
- Carrinho adiciona/remove.
- CEP funciona.
- Retirada funciona.
- Cupom válido funciona.
- Cupom inválido é recusado.
- Checkout finaliza.
- Pedido aparece no admin.
- Página de pedido abre.

### 20.2 Checklist admin

- Admin loga.
- Cliente comum não acessa admin.
- Caixa não acessa admin sensível.
- Produto cria/edita.
- SKU duplicado é recusado.
- Estoque atualiza.
- Banner aparece na home.
- Auditoria registra ações.
- Upload Cloudinary funciona.

### 20.3 Checklist PDV

- Caixa loga.
- Abre caixa.
- Busca produto por SKU.
- Leitor de código funciona.
- Venda finaliza.
- Estoque baixa.
- Desconto respeita limite.
- Pagamento misto fecha.
- Comprovante abre.
- Cancelamento devolve estoque.
- Fecha caixa.
- Relatório mostra venda.

### 20.4 Checklist Mercado Pago

- Preferência é criada.
- Checkout Pro abre.
- Pagamento sandbox aprova.
- Webhook chega.
- Pedido vira `PAID`.
- Estoque baixa uma vez só.
- Reembolso/cancelamento não duplica movimento.

---

## 21. Preparar banco online no Neon

1. Crie conta no Neon.
2. Crie projeto `xnutri-production`.
3. Escolha região próxima da hospedagem.
4. Abra `Connect`.
5. Copie a URL com pooler para `DATABASE_URL`.
6. Copie a URL direta para `DIRECT_URL`.
7. Garanta `sslmode=require`.

Exemplo fictício:

```env
DATABASE_URL=postgresql://usuario:senha@ep-exemplo-pooler.us-east-2.aws.neon.tech/xnutri?sslmode=require
DIRECT_URL=postgresql://usuario:senha@ep-exemplo.us-east-2.aws.neon.tech/xnutri?sslmode=require
```

Não copie o exemplo. Use o valor real do Neon.

Testar banco online antes de publicar:

```powershell
$env:DATABASE_URL="COLE_A_URL_POOLER_DO_NEON"
$env:DIRECT_URL="COLE_A_URL_DIRETA_DO_NEON"

npm run db:validate
npm run db:status
npm run db:deploy
```

Se o banco for novo e vazio, rode seed uma única vez, se fizer sentido:

```powershell
npm run db:seed
```

Em loja já usada, não rode seed.

Limpe:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DIRECT_URL -ErrorAction SilentlyContinue
```

---

## 22. Variáveis de produção

Configure no painel da hospedagem, nunca no código.

```env
NODE_ENV=production
XNUTRI_DEPLOYMENT=production

NEXT_PUBLIC_APP_URL=https://seu-dominio.com.br
AUTH_URL=https://seu-dominio.com.br
NEXTAUTH_URL=https://seu-dominio.com.br
AUTH_SECRET=COLE_UM_SEGREDO_FORTE
AUTH_TRUST_HOST=true
AUTH_SESSION_MAX_AGE_SECONDS=28800

DATABASE_URL=COLE_A_URL_POOLER_DO_NEON
DIRECT_URL=COLE_A_URL_DIRETA_DO_NEON
DATABASE_POOL_MAX=2

MERCADO_PAGO_ENVIRONMENT=sandbox
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_PUBLIC_KEY=
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_WEBHOOK_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=xnutri

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

PDV_CASHIER_MAX_DISCOUNT_PERCENT=10
```

Use sempre HTTPS e sem barra no final:

```env
NEXT_PUBLIC_APP_URL=https://xnutrimirassol.com.br
AUTH_URL=https://xnutrimirassol.com.br
NEXTAUTH_URL=https://xnutrimirassol.com.br
```

---

## 23. Publicar na Vercel

1. Envie o projeto para GitHub.
2. Na Vercel, clique em `Add New > Project`.
3. Importe o repositório.
4. Framework: Next.js.
5. Não defina Output Directory.
6. Configure as variáveis de ambiente.
7. Confirme que o `vercel.json` usa:
   - install: `npm ci`;
   - build: `npm run vercel-build`.
8. Faça deploy.
9. Veja logs.

Comando esperado no build:

```powershell
npm run production:check
prisma generate
prisma migrate deploy
next build
```

Não use:

```powershell
prisma migrate dev
```

na Vercel. Esse comando é só para desenvolvimento.

Depois do deploy:

1. Abra site.
2. Teste `/api/health`, se existir.
3. Teste login admin.
4. Teste produto.
5. Teste checkout sandbox.
6. Teste webhook.
7. Teste PDV.
8. Só depois ative Mercado Pago produção.

---

## 24. Publicar na Hostinger

Use a Hostinger se for usar Aplicação Web Node.js gerenciada.

### 24.1 Configurações

No hPanel:

- Framework: Next.js;
- Node.js: 22.x;
- Package manager: npm;
- Branch: `main` ou branch de produção.

Campos:

| Campo | Valor |
| --- | --- |
| Install command | `npm ci` |
| Build command | `npm run hostinger-build` |
| Start command | `npm run start` |
| Output directory | `.next`, somente se o painel pedir |
| Package manager | `npm` |

Não configure arquivo de entrada manual se o painel detectar Next.js.

### 24.2 Antes de enviar ao GitHub

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
```

Confira segredo:

```powershell
git status
git diff -- .env.local .env
```

Depois:

```powershell
git add .
git commit -m "prepare production deploy"
git push
```

### 24.3 Variáveis Hostinger

Crie localmente:

```powershell
Copy-Item .env.production.example .env.hostinger
notepad .env.hostinger
```

Importe no painel da Hostinger, mas não envie ao GitHub.

Use:

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

Adicione Mercado Pago, Cloudinary e Google se for usar.

### 24.4 Build Hostinger

O build deve executar:

```text
npm run production:check
prisma migrate deploy
prisma generate
next build
```

Se faltar banco, domínio HTTPS ou `AUTH_SECRET`, o deploy deve falhar antes de publicar.

---

## 25. Ativar produção real do Mercado Pago

Só faça isso depois que sandbox estiver 100%.

1. Troque `MERCADO_PAGO_ENVIRONMENT` para:

```env
MERCADO_PAGO_ENVIRONMENT=production
```

2. Use Access Token de produção.
3. Use Public Key de produção.
4. Configure webhook real:

```text
https://seu-dominio.com.br/api/payments/mercado-pago/webhook
```

5. Configure `MERCADO_PAGO_WEBHOOK_SECRET`.
6. Faça novo deploy.
7. Faça pedido pequeno real.
8. Confirme:
   - pedido pago;
   - estoque baixou;
   - webhook processou;
   - cliente voltou para página certa;
   - admin mostra status certo.

---

## 26. Logs e diagnóstico

Quando der erro, olhe nesta ordem:

1. Terminal local ou logs da hospedagem.
2. Variáveis de ambiente.
3. Banco.
4. Prisma.
5. Build.
6. Webhook.
7. Permissões.
8. Auditoria do admin.

### Erro `MissingSecret`

Falta `AUTH_SECRET`.

Correção:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Coloque em produção e faça redeploy.

### `DATABASE_URL not found`

A variável não foi configurada ou ficou com nome errado.

Correção: configure `DATABASE_URL` no painel da hospedagem.

### `Prisma Client did not initialize`

Rode:

```powershell
npm run db:generate
npm run build
```

Em produção, confira se o build chama `prisma generate`.

### `P1001 Can't reach database server`

Banco inacessível.

Confira:

- URL;
- senha;
- SSL;
- pooler;
- firewall;
- banco ligado;
- região/provedor.

### `P2021 table does not exist`

Migration não rodou.

Correção:

```powershell
npm run db:deploy
```

### Webhook Mercado Pago `401`

Falta segredo ou assinatura inválida.

Confira:

```env
MERCADO_PAGO_WEBHOOK_SECRET
```

E o webhook cadastrado no painel.

### Cloudinary não envia imagem

Confira:

```env
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Também veja se o usuário é admin e se o arquivo tem tipo permitido.

### Produto não aparece

Confira:

- ativo/inativo;
- estoque;
- variação ativa;
- categoria;
- filtros;
- imagem quebrada;
- seed antigo;
- cache.

### Venda PDV não finaliza

Confira:

- caixa aberto;
- estoque;
- forma de pagamento;
- desconto;
- banco;
- permissão do usuário;
- logs.

### Build falha

Rode local:

```powershell
npm run typecheck
npm run lint
npm run build
```

Corrija local antes de publicar.

---

## 27. Checklist final antes de abrir a loja

### Local

- [ ] `npm install` funcionando.
- [ ] Docker rodando.
- [ ] `.env.local` configurado.
- [ ] `npm run db:generate` OK.
- [ ] `npm run db:deploy` OK.
- [ ] `npm run db:seed` OK apenas em dev.
- [ ] `npm run dev` abre.
- [ ] loja abre.
- [ ] admin abre.
- [ ] PDV abre.

### Integrações

- [ ] Cloudinary envia imagem.
- [ ] Mercado Pago sandbox cria pagamento.
- [ ] Webhook sandbox processa.
- [ ] Google OAuth funciona, se usado.
- [ ] CEP/frete/retirada funcionam.

### Admin

- [ ] Produto cadastra.
- [ ] Banner cadastra.
- [ ] Estoque ajusta.
- [ ] Pedido aparece.
- [ ] Auditoria registra.
- [ ] Permissões corretas.

### PDV

- [ ] Caixa abre.
- [ ] Produto escaneia.
- [ ] Venda finaliza.
- [ ] Estoque baixa.
- [ ] Comprovante abre.
- [ ] Cancelamento devolve estoque.
- [ ] Caixa fecha.

### Produção

- [ ] Banco online configurado.
- [ ] `DATABASE_URL` pooler.
- [ ] `DIRECT_URL` direta.
- [ ] HTTPS configurado.
- [ ] `AUTH_SECRET` forte.
- [ ] Credenciais de teste removidas.
- [ ] Senha do banco rotacionada se já foi compartilhada.
- [ ] Webhook Mercado Pago com segredo.
- [ ] Backup configurado.
- [ ] Restauração testada.
- [ ] Monitoramento configurado.
- [ ] Painéis com MFA.
- [ ] `npm run build` OK.
- [ ] deploy OK.
- [ ] teste real pequeno OK.

---

## 28. Comandos rápidos

### Local do zero

```powershell
cd "C:\Users\Sharif\Downloads\xnutri"
npm install
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
docker compose up -d
npm run db:generate
npm run db:deploy
npm run db:seed
npm run admin:create
npm run dev
```

### Verificar antes do deploy

```powershell
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=high
```

### Banco online

```powershell
$env:DATABASE_URL="COLE_A_URL_POOLER_DO_NEON"
$env:DIRECT_URL="COLE_A_URL_DIRETA_DO_NEON"
npm run db:validate
npm run db:status
npm run db:deploy
```

### Criar admin em produção

```powershell
$env:ADMIN_EMAIL="admin@seudominio.com"
$env:ADMIN_PASSWORD="SenhaMuitoForte#2026"
$env:ADMIN_NAME="Administrador"
npm run admin:create
```

### Limpar variáveis temporárias

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DIRECT_URL -ErrorAction SilentlyContinue
Remove-Item Env:ADMIN_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:ADMIN_NAME -ErrorAction SilentlyContinue
```

---

## 29. Resumo na lata

Para rodar local:

```text
npm install → .env.local → docker compose up -d → db:generate → db:deploy → db:seed → admin:create → npm run dev
```

Para publicar:

```text
Neon online → variáveis de produção → build local OK → GitHub → Vercel/Hostinger → testar sandbox → ativar produção
```

Para não dar ruim:

```text
Não envie .env
Não use Docker como banco de produção
Não rode seed em banco real
Não use senha de teste
Não aceite pagamento sem webhook
Não coloque segredo com NEXT_PUBLIC_
Não confie em preço vindo do navegador
```

---

## 30. Fontes consolidadas

Este tutorial consolidou os seguintes arquivos enviados:

- `AUDITORIA-SEGURANCA-2026-07-05.md`
- `SEGURANCA.md`
- `GOOGLE-OAUTH.md`
- `RELATORIO-QA.md`
- `HOSTINGER.md`
- `PRODUCAO.md`
- `deploy.md`
- `TUTORIAL-COMPLETO-XNUTRI.md`
- `TUTORIAL-INTEGRACAO.md`
- `CLOUDINARY.md`
- `PDV.md`
- `instalacao.md`
- `banners.md`
- `produtos.md`
- `estoque.md`
- `mercado-pago.md`
