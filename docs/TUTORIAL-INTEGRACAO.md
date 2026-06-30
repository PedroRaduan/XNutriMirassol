# Tutorial completo para conectar a XNutri

Este arquivo é o passo a passo principal para ligar tudo do projeto: loja online, carrinho, checkout, admin, estoque, financeiro, PDV, Mercado Pago, Cloudinary e banco PostgreSQL.

Ele foi escrito para você conseguir copiar os comandos e executar na ordem. O ambiente usado aqui é Windows com PowerShell.

## 0. Antes de começar: onde cada coisa fica

Arquivos principais que você vai mexer ou conferir:

| O que é | Arquivo ou pasta |
| --- | --- |
| Variáveis de ambiente de exemplo | `.env.example` |
| Variáveis reais da sua máquina | `.env.local` |
| Banco local com Docker | `docker-compose.yml` |
| Scripts de comando | `package.json` |
| Modelos do banco | `prisma/schema.prisma` |
| Dados iniciais de teste | `prisma/seed.ts` |
| Criar administrador manualmente | `scripts/create-admin.ts` |
| Loja/home/catálogo | `src/app/(site)/` |
| Carrinho e checkout | `src/app/(site)/(shop)/` |
| Painel admin | `src/app/admin/` |
| PDV/caixa | `src/app/pdv/` |
| Ações do admin | `src/lib/actions/admin.ts` |
| Ações do checkout | `src/lib/actions/checkout.ts` |
| Mercado Pago | `src/lib/payments/mercado-pago.ts` |
| Webhook Mercado Pago | `src/app/api/payments/mercado-pago/webhook/route.ts` |
| Upload Cloudinary | `src/app/api/admin/uploads/cloudinary/route.ts` |
| Configuração Cloudinary | `src/lib/cloudinary.ts` |
| Frete | `src/lib/shipping/quote.ts` |
| Cotação de frete API | `src/app/api/shipping/quote/route.ts` |
| CEP API | `src/app/api/cep/[cep]/route.ts` |

Outros guias úteis:

- `docs/mercado-pago.md`
- `docs/estoque.md`
- `docs/PDV.md`
- `docs/deploy.md`
- `docs/banners.md`
- `docs/produtos.md`

## 1. Abrir a pasta certa no terminal

Abra o PowerShell e entre na pasta do projeto:

```powershell
cd "C:\Users\Sharif\Downloads\xnutri"
```

Confira se você está na pasta certa:

```powershell
Get-ChildItem
```

Você precisa ver arquivos como:

- `package.json`
- `docker-compose.yml`
- `.env.example`
- `prisma`
- `src`
- `docs`

## 2. Conferir programas obrigatórios

Rode:

```powershell
node -v
npm -v
docker --version
```

O ideal:

- Node.js: versão 20 ou superior.
- npm: qualquer versão atual junto do Node.
- Docker Desktop: instalado e aberto.

Se o comando `docker --version` falhar, abra o Docker Desktop ou instale o Docker antes de continuar.

## 3. Instalar as dependências do projeto

Na pasta `C:\Users\Sharif\Downloads\xnutri`, rode:

```powershell
npm install
```

Como saber que deu certo:

- A pasta `node_modules` existe.
- O comando termina sem erro vermelho.
- O arquivo `package-lock.json` fica atualizado.

Se der erro, tente:

```powershell
npm install --legacy-peer-deps
```

Use esse segundo comando só se o primeiro falhar.

## 4. Criar e preencher o arquivo `.env.local`

O arquivo `.env.local` é onde ficam as senhas e chaves reais da sua máquina. Ele não deve ir para o Git.

Se o arquivo ainda não existir, copie o modelo:

```powershell
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Abra o arquivo:

```powershell
notepad .env.local
```

Gere uma chave segura para `AUTH_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copie o resultado e coloque no `.env.local` assim:

```env
AUTH_SECRET=cole-a-chave-gerada-aqui
```

Para rodar localmente, deixe estas variáveis assim:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xnutri?schema=public
DATABASE_POOL_MAX=5
PRISMA_LOG_ERRORS=false
```

Configuração de loja:

```env
NEXT_PUBLIC_STORE_NAME=XNutri
NEXT_PUBLIC_STORE_CITY=Mirassol
NEXT_PUBLIC_STORE_STATE=SP
```

Configuração do PDV:

```env
NEXT_PUBLIC_PDV_ENABLED=true
PDV_RECEIPT_FOOTER=Obrigado pela compra. Este comprovante nao substitui documento fiscal.
PDV_ALLOW_NEGATIVE_STOCK=false
```

Configuração PWA:

```env
NEXT_PUBLIC_PWA_NAME=XNutri PDV
NEXT_PUBLIC_PWA_SHORT_NAME=XNutri
```

Por enquanto, você pode deixar Mercado Pago e Cloudinary com valores de teste. Mais abaixo tem a parte específica de cada integração.

## 5. Ligar o banco PostgreSQL local

O projeto já tem um banco PostgreSQL pronto no arquivo `docker-compose.yml`.

Ligue o banco:

```powershell
docker compose up -d
```

Confira se o banco subiu:

```powershell
docker compose ps
```

Você deve ver o serviço `postgres` rodando.

Se quiser ver os últimos logs do banco:

```powershell
docker logs xnutri-postgres --tail 50
```

Dados do banco local:

```text
Host: localhost
Porta: 5432
Banco: xnutri
Usuário: postgres
Senha: postgres
```

Esses dados precisam bater com a variável:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xnutri?schema=public
```

## 6. Preparar Prisma, tabelas e dados iniciais

Gere o cliente Prisma:

```powershell
npm run db:generate
```

Crie as tabelas no banco usando as migrations:

```powershell
npm run db:deploy
```

Coloque dados iniciais de teste:

```powershell
npm run db:seed
```

O `seed` usa o arquivo:

```text
prisma/seed.ts
```

Ele cria produtos, categorias, estoque, configurações e usuários de teste.

Importante: não rode `npm run db:seed` em produção com clientes e pedidos reais sem revisar antes, porque ele foi feito para ambiente inicial/desenvolvimento.

## 7. Criar ou trocar o administrador

O seed normalmente cria contas de teste. As principais são:

```text
Admin: admin@xnutri.com.br / Admin@12345
Caixa: caixa@xnutri.com.br / Caixa@12345
```

Para criar outro administrador, use:

```powershell
npm run admin:create -- novo-admin@seudominio.com "SenhaForte@123" "Nome do Administrador"
```

O script usado é:

```text
scripts/create-admin.ts
```

Depois de publicar o site, troque todas as senhas de teste.

## 8. Rodar o site completo localmente

Ligue o servidor de desenvolvimento:

```powershell
npm run dev
```

Abra no navegador:

```text
Loja: http://localhost:3000
Catálogo: http://localhost:3000/catalogo
Carrinho: http://localhost:3000/carrinho
Checkout: http://localhost:3000/checkout
Admin: http://localhost:3000/admin
PDV: http://localhost:3000/pdv
```

Como saber que conectou certo:

- A home abre sem tela de erro.
- Produtos aparecem.
- O admin abre a tela de login.
- O PDV abre a tela de login.
- Ao logar no admin, aparecem dashboard, produtos, pedidos, estoque e financeiro.
- Ao logar no PDV, aparece a tela de venda/caixa.

Se a porta 3000 estiver ocupada:

```powershell
netstat -ano | findstr :3000
```

Depois pare o processo pelo PID mostrado:

```powershell
Stop-Process -Id NUMERO_DO_PID -Force
```

Troque `NUMERO_DO_PID` pelo número real.

## 9. Testar loja, carrinho e checkout

Com o site rodando em `http://localhost:3000`, faça:

1. Abra `http://localhost:3000/catalogo`.
2. Clique em um produto.
3. Adicione ao carrinho.
4. Abra `http://localhost:3000/carrinho`.
5. Digite um CEP.
6. Escolha frete ou retirada, se aparecer.
7. Vá para `http://localhost:3000/checkout`.
8. Preencha os dados do cliente.
9. Finalize o pedido.

Arquivos principais dessa parte:

```text
src/app/(site)/(shop)/carrinho/page.tsx
src/app/(site)/(shop)/checkout/page.tsx
src/components/cart/
src/components/checkout/
src/lib/actions/cart.ts
src/lib/actions/checkout.ts
src/lib/ecommerce/orders.ts
```

Se der erro no carrinho ou checkout, confira primeiro:

```powershell
docker compose ps
npm run db:deploy
npm run db:generate
```

Depois reinicie:

```powershell
npm run dev
```

## 10. Conectar Mercado Pago

Arquivos envolvidos:

```text
src/lib/payments/mercado-pago.ts
src/app/api/payments/mercado-pago/preference/route.ts
src/app/api/payments/mercado-pago/webhook/route.ts
src/lib/actions/checkout.ts
src/lib/ecommerce/orders.ts
```

No painel do Mercado Pago:

1. Crie ou abra uma aplicação.
2. Copie o Access Token.
3. Copie a Public Key.
4. Se houver segredo/assinatura de webhook, copie também.

Coloque no `.env.local`:

```env
MERCADO_PAGO_ACCESS_TOKEN=TEST-ou-APP_USR-seu-access-token
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-ou-APP_USR-sua-public-key
MERCADO_PAGO_WEBHOOK_SECRET=seu-segredo-do-webhook-se-existir
```

Reinicie o servidor depois de alterar o `.env.local`:

```powershell
npm run dev
```

Webhook que você deve cadastrar no Mercado Pago quando estiver com domínio público:

```text
https://seu-dominio.com/api/payments/mercado-pago/webhook
```

Em localhost, o Mercado Pago não consegue chamar `http://localhost:3000`. Para testar webhook local, você precisa de uma URL pública temporária, como ngrok ou túnel equivalente.

Fluxo esperado:

1. Cliente finaliza o checkout.
2. O sistema cria o pedido no banco.
3. O sistema cria a preferência no Mercado Pago.
4. Cliente paga pelo Mercado Pago.
5. Mercado Pago chama o webhook.
6. Webhook atualiza pagamento, pedido e estoque.

Como testar antes de publicar:

```powershell
npm run lint
npm run build
```

Depois faça um pedido de teste usando credenciais de teste do Mercado Pago.

## 11. Conectar Cloudinary para imagens

Arquivos envolvidos:

```text
src/lib/cloudinary.ts
src/app/api/admin/uploads/cloudinary/route.ts
src/app/admin/(protected)/banners/page.tsx
src/app/admin/(protected)/produtos/page.tsx
```

No painel do Cloudinary, copie:

- Cloud Name
- API Key
- API Secret

Coloque no `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=sua-api-secret
CLOUDINARY_FOLDER=xnutri
```

Reinicie o servidor:

```powershell
npm run dev
```

Teste:

1. Entre em `http://localhost:3000/admin`.
2. Vá em `Banners e home`.
3. Faça upload de uma imagem.
4. Salve.
5. Veja se ela aparece na home.

Importante: `CLOUDINARY_API_SECRET` nunca deve ter `NEXT_PUBLIC_` no começo, porque é uma chave secreta do servidor.

## 12. Conectar frete, CEP e retirada

Arquivos envolvidos:

```text
src/lib/shipping/cep.ts
src/lib/shipping/quote.ts
src/app/api/cep/[cep]/route.ts
src/app/api/shipping/quote/route.ts
src/components/cart/shipping-estimator.tsx
src/app/admin/(protected)/entregas/page.tsx
```

No admin:

1. Entre em `http://localhost:3000/admin`.
2. Abra `Frete e retirada`.
3. Cadastre endereço da loja.
4. Configure retirada.
5. Configure frete manual para sua região.
6. Salve.

No carrinho:

1. Abra `http://localhost:3000/carrinho`.
2. Informe um CEP.
3. Veja se aparece cotação.
4. Escolha frete ou retirada.
5. Confira se o total muda.

Se a consulta de CEP falhar, o cliente deve receber mensagem amigável e conseguir tentar novamente.

## 13. Conectar estoque, lucro e financeiro

Arquivos envolvidos:

```text
src/app/admin/(protected)/estoque/page.tsx
src/app/admin/(protected)/financeiro/page.tsx
src/lib/finance/calculations.ts
src/lib/finance/settings.ts
src/lib/ecommerce/orders.ts
src/lib/actions/pos.ts
src/components/pdv/
```

No admin, faça nesta ordem:

1. Cadastre categorias.
2. Cadastre produtos.
3. Cadastre variações, se tiver.
4. Informe preço de venda.
5. Informe custo do produto.
6. Informe custo de embalagem, imposto e taxas, se usar.
7. Adicione estoque.

Depois teste:

1. Faça uma venda online.
2. Veja se o estoque baixou.
3. Faça uma venda no PDV.
4. Veja se o mesmo estoque baixou.
5. Abra `Financeiro`.
6. Confira faturamento, custo, lucro e margem.

Regra geral:

```text
Lucro = venda - custo do produto - embalagem - imposto - taxas
```

O painel financeiro junta vendas online e vendas do PDV.

## 14. Conectar e usar o PDV

Arquivos envolvidos:

```text
src/app/pdv/
src/app/api/pdv/products/route.ts
src/app/api/pdv/customers/route.ts
src/components/pdv/
src/lib/actions/pos.ts
docs/PDV.md
```

No `.env.local`, deixe:

```env
NEXT_PUBLIC_PDV_ENABLED=true
PDV_RECEIPT_FOOTER=Obrigado pela compra. Este comprovante nao substitui documento fiscal.
PDV_ALLOW_NEGATIVE_STOCK=false
```

Rode:

```powershell
npm run dev
```

Abra:

```text
http://localhost:3000/pdv
```

Entre com a conta de caixa:

```text
E-mail: caixa@xnutri.com.br
Senha: Caixa@12345
```

Fluxo recomendado:

1. Abra o caixa.
2. Busque produto.
3. Adicione ao carrinho do PDV.
4. Escolha pagamento.
5. Finalize venda.
6. Abra o comprovante.
7. Confira estoque no admin.
8. Feche o caixa no fim do dia.

Se o PDV não mostrar produtos:

```powershell
docker compose ps
npm run db:seed
npm run dev
```

Depois entre novamente no PDV.

## 15. Conectar admin completo

Páginas principais:

```text
src/app/admin/(protected)/page.tsx
src/app/admin/(protected)/produtos/page.tsx
src/app/admin/(protected)/categorias/page.tsx
src/app/admin/(protected)/pedidos/page.tsx
src/app/admin/(protected)/estoque/page.tsx
src/app/admin/(protected)/financeiro/page.tsx
src/app/admin/(protected)/cupons/page.tsx
src/app/admin/(protected)/banners/page.tsx
src/app/admin/(protected)/entregas/page.tsx
src/app/admin/(protected)/configuracoes/page.tsx
```

Ações principais:

```text
src/lib/actions/admin.ts
src/components/admin/admin-action-form.tsx
```

Teste cada área:

1. Dashboard abre e mostra números.
2. Produtos salvam com mensagem de sucesso.
3. Categorias salvam.
4. Banners salvam e aparecem na home.
5. Cupons aplicam desconto no carrinho.
6. Entregas aparecem no carrinho/checkout.
7. Estoque aumenta e diminui.
8. Pedidos mudam de status.
9. Financeiro mostra lucro e gráficos.
10. Configurações salvam.

Se alguma ação do admin falhar, a tela deve mostrar mensagem de erro clara em vez de quebrar o site.

## 16. SEO, performance e arquivos públicos

Arquivos envolvidos:

```text
src/app/layout.tsx
src/app/sitemap.ts
src/app/robots.ts
src/app/opengraph-image.tsx
src/app/manifest.ts
next.config.ts
public/
```

Teste as URLs:

```text
http://localhost:3000/robots.txt
http://localhost:3000/sitemap.xml
http://localhost:3000/opengraph-image
```

Também rode:

```powershell
npm run build
```

Se o build passar, é um bom sinal de que SEO, rotas e páginas principais estão compilando corretamente.

## 17. Checklist rápido para saber se tudo está conectado

Rode:

```powershell
npm run lint
npm run build
```

Depois confira manualmente:

- Home abre.
- Catálogo abre.
- Produto abre.
- Produto entra no carrinho.
- Carrinho calcula frete ou retirada.
- Cupom aplica desconto.
- Checkout valida campos.
- Pedido é criado.
- Mercado Pago abre preferência de pagamento.
- Webhook atualiza pagamento quando estiver público.
- Admin salva produtos, categorias, banners, cupons e frete.
- Estoque baixa em pedido pago.
- Estoque baixa em venda PDV.
- Financeiro mostra lucro.
- PDV vende e gera comprovante.
- `/robots.txt` responde.
- `/sitemap.xml` responde.
- `/opengraph-image` responde.

## 18. Publicar em produção

Na produção você precisa configurar as mesmas variáveis do `.env.local` no painel da hospedagem.

Variáveis obrigatórias:

```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
AUTH_SECRET=uma-chave-segura-diferente-da-local
DATABASE_URL=sua-url-do-postgresql-de-producao
DATABASE_POOL_MAX=5
MERCADO_PAGO_ACCESS_TOKEN=access-token-de-producao
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=public-key-de-producao
MERCADO_PAGO_WEBHOOK_SECRET=seu-segredo-se-usar
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=sua-api-secret
CLOUDINARY_FOLDER=xnutri
NEXT_PUBLIC_STORE_NAME=XNutri
NEXT_PUBLIC_STORE_CITY=Mirassol
NEXT_PUBLIC_STORE_STATE=SP
NEXT_PUBLIC_PDV_ENABLED=true
PDV_ALLOW_NEGATIVE_STOCK=false
```

No servidor/provedor, rode:

```powershell
npm run db:deploy
npm run build
npm run start
```

Em produção:

- Use banco PostgreSQL real/gerenciado.
- Use domínio HTTPS.
- Use credenciais reais do Mercado Pago.
- Cadastre o webhook com domínio real.
- Não use senha de teste.
- Não rode seed em banco com dados reais sem revisar.
- O modo demo do admin/PDV fica bloqueado por segurança.

## 19. Problemas comuns e como resolver

### Banco indisponível

Confira:

```powershell
docker compose ps
docker logs xnutri-postgres --tail 50
```

Depois rode:

```powershell
npm run db:deploy
npm run db:generate
```

### Erro de login no admin ou PDV

Confira se o banco está ligado:

```powershell
docker compose ps
```

Confira se rodou o seed:

```powershell
npm run db:seed
```

Ou crie novo admin:

```powershell
npm run admin:create -- admin@seudominio.com "SenhaForte@123" "Administrador"
```

### Produto não aparece

Confira:

- Produto está ativo no admin.
- Categoria está ativa.
- Produto tem preço.
- Produto tem estoque, se o sistema exigir.
- O seed foi executado.

Comandos úteis:

```powershell
npm run db:studio
```

O Prisma Studio abre uma tela para ver os dados do banco.

### Mercado Pago não atualiza pedido

Confira:

- `MERCADO_PAGO_ACCESS_TOKEN` está certo.
- `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` está certa.
- `NEXT_PUBLIC_APP_URL` está com domínio HTTPS em produção.
- Webhook cadastrado:

```text
https://seu-dominio.com/api/payments/mercado-pago/webhook
```

Lembre: Mercado Pago não chama `localhost`.

### Cloudinary não envia imagem

Confira:

```env
CLOUDINARY_CLOUD_NAME=\w
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=xnutri
```

Depois reinicie:

```powershell
npm run dev
```

### Origem inválida ou erro de segurança

Confira se o endereço usado no navegador bate com:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Se você abrir por `http://127.0.0.1:3000`, teste também com `http://localhost:3000`.

Em produção, use:

```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

### Porta 3000 ocupada

Veja o processo:

```powershell
netstat -ano | findstr :3000
```

Pare pelo PID:

```powershell
Stop-Process -Id NUMERO_DO_PID -Force
```

### Build falha

Rode:

```powershell
npm run lint
npm run build
```

Se o erro citar banco, confira:

```powershell
docker compose ps
npm run db:deploy
npm run db:generate
```

## 20. Ordem recomendada para você fazer tudo certinho

Se quiser seguir sem pensar muito, faça exatamente nesta ordem:

```powershell
cd "C:\Users\Sharif\Downloads\xnutri"
npm install
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
docker compose up -d
docker compose ps
npm run db:generate
npm run db:deploy
npm run db:seed
npm run admin:create -- admin@xnutri.com.br "SenhaForte@123" "Administrador XNutri"
npm run lint
npm run build
npm run dev
```

Depois abra:

```text
http://localhost:3000
http://localhost:3000/admin
http://localhost:3000/pdv
```

Quando for publicar, configure as variáveis no provedor e rode:

```powershell
npm run db:deploy
npm run build
npm run start
```

Pronto: seguindo essa ordem, você conecta banco, loja, admin, checkout, estoque, financeiro, PDV, imagens, SEO e pagamento sem precisar adivinhar onde cada coisa fica.
