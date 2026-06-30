# XNutri E-commerce

Guia completo para instalar, rodar, administrar e publicar o e-commerce da **XNutri**, loja de suplementos e moda fitness de Mirassol-SP.

Este README foi escrito para quem está começando. Siga a ordem dos passos e, se algum comando der erro, veja a seção **Erros comuns** no final.

> Quer colocar tudo para funcionar sem rodeios? Use o [tutorial completo com comandos prontos](docs/TUTORIAL-COMPLETO-XNUTRI.md) ou o [tutorial de integração passo a passo](docs/TUTORIAL-INTEGRACAO.md).

## Sumário

- [O Que É Este Projeto](#o-que-é-este-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Antes De Começar](#antes-de-começar)
- [Instalação Local Do Zero](#instalação-local-do-zero)
- [Contas Criadas Pelo Seed](#contas-criadas-pelo-seed)
- [Como Rodar O Site](#como-rodar-o-site)
- [Estrutura De Pastas](#estrutura-de-pastas)
- [Variáveis De Ambiente](#variáveis-de-ambiente)
- [Banco De Dados E Prisma](#banco-de-dados-e-prisma)
- [Como Usar O Admin](#como-usar-o-admin)
- [Como Usar O PDV](#como-usar-o-pdv)
- [Produtos, Categorias E Descontos](#produtos-categorias-e-descontos)
- [Estoque](#estoque)
- [Cupons](#cupons)
- [Frete E Retirada Na Loja](#frete-e-retirada-na-loja)
- [Mercado Pago](#mercado-pago)
- [Cloudinary](#cloudinary)
- [SEO](#seo)
- [Deploy](#deploy)
- [Erros Comuns](#erros-comuns)
- [Comandos Úteis](#comandos-úteis)
- [Checklist Antes De Produção](#checklist-antes-de-produção)

## O Que É Este Projeto

Este projeto é um e-commerce completo para a XNutri.

Ele possui:

- Loja pública para clientes comprarem.
- Catálogo de produtos.
- Carrinho.
- Checkout.
- Retirada na loja.
- Frete.
- Pagamento preparado com Mercado Pago.
- Login e área do cliente.
- Painel administrativo.
- PDV presencial em `/pdv`.
- Controle de produtos, estoque, pedidos, clientes, cupons, banners e relatórios.

Categorias públicas principais:

- `Suplementos`
- `Moda Fitness`

Dentro de `Suplementos` entram produtos como whey, creatina, pré-treino, vitaminas e acessórios de treino. Dentro de `Moda Fitness` entram camisetas, leggings, shorts, tops e peças esportivas.

## Funcionalidades

### Loja Pública

- Home com hero, produtos em destaque, categorias, benefícios, avaliações, newsletter, mais vendidos e promoções.
- Catálogo com busca, filtros e ordenação.
- Página de produto com imagens, variações, estoque, avaliações e relacionados.
- Carrinho com atualização, cupons e estimativa de frete.
- Checkout com endereço, entrega, retirada na loja, resumo do pedido e Mercado Pago.
- Páginas institucionais: sobre, contato, FAQ, trocas, privacidade, termos, entrega e retirada.

### Cliente

- Login.
- Cadastro.
- Recuperação de senha.
- Perfil.
- Endereços.
- Histórico de pedidos.

### Admin

- Dashboard.
- Produtos.
- Categorias.
- Estoque.
- Cupons.
- Pedidos.
- Clientes.
- Relatórios.
- Banners.
- Entregas e retirada.
- Configurações.
- Auditoria.

### PDV Presencial

- Caixa privado em `/pdv`.
- Busca por nome, SKU, código de barras, EAN e código interno.
- Venda com produtos e variações.
- Pagamento em dinheiro, Pix, débito, crédito, Mercado Pago e pagamento misto.
- Cálculo de troco.
- Abertura e fechamento de caixa.
- Sangria e reforco.
- Baixa automatica de estoque compartilhado com o site.
- Comprovante com impressao, PDF pelo navegador, WhatsApp e e-mail.
- Cancelamento total e devolucao parcial.
- Relatórios de vendas presenciais.

### Pagamentos

- PIX via Mercado Pago.
- Cartão via Mercado Pago.
- Criação de preferência de pagamento.
- Webhook para atualização automática.
- Controle de status do pedido.

### Status Dos Pedidos

No banco, os status são salvos em inglês porque são enums técnicos:

| Status técnico | Significado no painel |
| --- | --- |
| `PENDING` | Pendente |
| `PAID` | Pago |
| `PREPARING` | Em preparação |
| `AWAITING_PICKUP` | Aguardando retirada |
| `SHIPPED` | Enviado |
| `DELIVERED` | Entregue |
| `CANCELED` | Cancelado |
| `REFUNDED` | Reembolsado |

## Tecnologias

- Next.js 16 com App Router.
- React 19.
- TypeScript.
- Tailwind CSS 4.
- PostgreSQL.
- Prisma ORM 7.
- Auth.js / NextAuth.
- React Hook Form.
- Zod.
- Server Actions.
- API Routes quando necessário.
- Mercado Pago.
- Cloudinary.
- Docker para banco local.

## Antes De Começar

Você precisa ter instalado:

1. **Node.js 20 ou superior**
   - Baixe em: https://nodejs.org
   - Depois confira no terminal:

```bash
node -v
npm -v
```

2. **Docker Desktop**
   - Baixe em: https://www.docker.com/products/docker-desktop
   - Ele será usado para rodar o PostgreSQL local.

3. **Git** opcional, mas recomendado
   - Baixe em: https://git-scm.com

4. **Editor de código**
   - Recomendado: Visual Studio Code.

## Instalação Local Do Zero

### 1. Entrar Na Pasta Do Projeto

No PowerShell:

```powershell
cd C:\Users\Sharif\Downloads\xnutri
```

Se você estiver em outra pasta, ajuste o caminho.

### 2. Instalar Dependências

Rode:

```bash
npm install
```

Esse comando instala tudo que está no `package.json`.

Se aparecer uma pasta `node_modules`, está normal. Ela guarda as bibliotecas do projeto.

### 3. Criar O Arquivo `.env`

O projeto vem com `.env.example`, que é um modelo.

Crie uma cópia chamada `.env`.

No PowerShell:

```powershell
Copy-Item .env.example .env
```

No Prompt de Comando:

```cmd
copy .env.example .env
```

Abra o arquivo `.env` e deixe assim para rodar localmente:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_SECRET=troque-por-uma-chave-segura-com-openssl-rand-base64-32
PRISMA_LOG_ERRORS=false

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xnutri?schema=public
DATABASE_POOL_MAX=5

ADMIN_EMAIL=admin@xnutri.com.br
ADMIN_PASSWORD=Admin@12345
ADMIN_NAME=Administrador XNutri

MERCADO_PAGO_ACCESS_TOKEN=TEST-0000000000000000-000000-00000000000000000000000000000000-000000000
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-00000000-0000-0000-0000-000000000000
MERCADO_PAGO_WEBHOOK_SECRET=

CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=sua-api-secret
CLOUDINARY_FOLDER=xnutri

NEXT_PUBLIC_STORE_NAME=XNutri
NEXT_PUBLIC_STORE_CITY=Mirassol
NEXT_PUBLIC_STORE_STATE=SP
```

Importante:

- Nunca coloque senhas reais no GitHub.
- O arquivo `.env` deve ficar só na sua máquina ou no painel seguro da hospedagem.
- Para scripts do banco, use `.env`. Não dependa apenas de `.env.local`.

### 4. Gerar Uma Chave Segura Para `AUTH_SECRET`

Se tiver OpenSSL instalado:

```bash
openssl rand -base64 32
```

Copie o resultado e cole em:

```env
AUTH_SECRET=resultado-gerado-aqui
```

Se não tiver OpenSSL, use uma senha longa aleatória com letras, números e símbolos.

### 5. Subir O PostgreSQL Com Docker

O projeto tem um `docker-compose.yml` pronto.

Rode:

```bash
docker compose up -d
```

Esse comando cria um banco PostgreSQL local.

Para verificar se subiu:

```bash
docker ps
```

Você deve ver um container chamado:

```text
xnutri-postgres
```

Dados locais padrão:

```text
Banco:   xnutri
Usuário: postgres
Senha:   postgres
Porta:   5432
```

### 6. Gerar O Prisma Client

Rode:

```bash
npm run db:generate
```

O Prisma Client é a ponte entre o código e o banco.

### 7. Criar As Tabelas Do Banco

Rode:

```bash
npm run db:migrate
```

Esse comando lê `prisma/schema.prisma` e cria as tabelas no PostgreSQL.

### 8. Popular O Banco Com Dados Iniciais

Rode:

```bash
npm run db:seed
```

O seed cria:

- Administrador.
- Cliente de teste.
- Categorias.
- Produtos de exemplo.
- Variações.
- Estoque.
- Cupons.
- Métodos de frete.
- Ponto de retirada.
- Banners.
- Configurações.
- Avaliações.

Atenção importante:

O seed deste projeto limpa e recria os dados principais. Use `npm run db:seed` em ambiente local, teste ou banco vazio. Não rode em produção com pedidos reais sem backup.

## Contas Criadas Pelo Seed

Admin:

```text
E-mail: admin@xnutri.com.br
Senha:  Admin@12345
URL:    http://localhost:3000/admin/login
```

Cliente:

```text
E-mail: cliente@xnutri.com.br
Senha:  Cliente@12345
URL:    http://localhost:3000/login
```

Troque essas senhas antes de usar em produção.

## Como Rodar O Site

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

Abra no navegador:

```text
Loja:        http://localhost:3000
Catálogo:    http://localhost:3000/catalogo
Carrinho:    http://localhost:3000/carrinho
Checkout:    http://localhost:3000/checkout
Admin:       http://localhost:3000/admin
Login admin: http://localhost:3000/admin/login
```

Para parar o servidor, volte ao terminal e aperte:

```text
Ctrl + C
```

## Estrutura De Pastas

```text
xnutri/
├─ src/
│  ├─ app/
│  │  ├─ (site)/                  Rotas públicas da loja
│  │  ├─ admin/                   Login e painel administrativo
│  │  └─ api/                     Rotas de API
│  ├─ components/                 Componentes reutilizáveis
│  ├─ lib/
│  │  ├─ actions/                 Server Actions
│  │  ├─ auth/                    Sessão e permissões
│  │  ├─ db/                      Prisma Client
│  │  ├─ ecommerce/               Carrinho, pedidos, cupons e estoque
│  │  ├─ payments/                Mercado Pago
│  │  ├─ shipping/                Frete, CEP e retirada
│  │  └─ validations.ts           Schemas Zod
├─ prisma/
│  ├─ schema.prisma               Schema do banco
│  ├─ seed.ts                     Dados iniciais
│  └─ migrations/                 Histórico das migrations
├─ scripts/
│  └─ create-admin.ts             Cria administrador manualmente
├─ docs/                          Guias complementares
├─ public/                        Arquivos públicos
├─ docker-compose.yml             PostgreSQL local
├─ .env.example                   Modelo de variáveis
├─ package.json                   Scripts e dependências
└─ README.md                      Este guia
```

## Rotas Principais

### Loja

| Rota | Função |
| --- | --- |
| `/` | Home |
| `/catalogo` | Catálogo |
| `/catalogo?category=suplementos` | Suplementos |
| `/catalogo?category=roupas-fitness` | Moda Fitness |
| `/produto/[slug]` | Página de produto |
| `/carrinho` | Carrinho |
| `/checkout` | Checkout |
| `/pedido/[orderNumber]` | Retorno/resumo do pedido |
| `/login` | Login do cliente |
| `/cadastro` | Cadastro |
| `/recuperar-senha` | Recuperação de senha |
| `/cliente` | Área do cliente |
| `/cliente/pedidos` | Pedidos do cliente |
| `/cliente/enderecos` | Endereços |
| `/cliente/perfil` | Perfil |

### Institucionais

| Rota | Função |
| --- | --- |
| `/sobre` | Sobre |
| `/contato` | Contato |
| `/faq` | Perguntas frequentes |
| `/trocas` | Trocas |
| `/privacidade` | Política de privacidade |
| `/termos` | Termos |
| `/entrega` | Entrega |
| `/retirada-na-loja` | Retirada na loja |

### Admin

| Rota | Função |
| --- | --- |
| `/admin/login` | Login administrativo |
| `/admin` | Dashboard |
| `/admin/produtos` | Produtos |
| `/admin/categorias` | Categorias |
| `/admin/estoque` | Estoque |
| `/admin/cupons` | Cupons |
| `/admin/pedidos` | Pedidos |
| `/admin/clientes` | Clientes |
| `/admin/relatorios` | Relatórios |
| `/admin/banners` | Banners |
| `/admin/entregas` | Entregas e retirada |
| `/admin/configuracoes` | Configurações |
| `/admin/auditoria` | Logs de auditoria |

### PDV

| Rota | Função |
| --- | --- |
| `/pdv/login` | Login do caixa |
| `/pdv` | Tela principal de venda presencial |
| `/pdv/relatorios` | Relatórios do PDV |
| `/pdv/comprovante/[saleNumber]` | Comprovante da venda |

## Como Usar O PDV

O guia completo esta em [`docs/PDV.md`](docs/PDV.md).

Resumo rapido:

1. Entre em `/pdv/login`.
2. Use `caixa@xnutri.com.br` / `Caixa@12345` no ambiente seedado.
3. Abra o caixa informando o valor inicial.
4. Busque ou escaneie produtos por nome, SKU, barcode, EAN ou código interno.
5. Escolha pagamento: dinheiro, Pix, débito, crédito, Mercado Pago ou misto.
6. Finalize a venda.
7. Imprima o comprovante.
8. Feche o caixa no fim do expediente.

## Variáveis De Ambiente

### App

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_SECRET=chave-secreta-forte
PRISMA_LOG_ERRORS=false
```

Explicação:

- `NEXT_PUBLIC_APP_URL`: URL pública do site.
- `AUTH_SECRET`: chave usada pela autenticação.
- `PRISMA_LOG_ERRORS`: se `true`, ajuda a ver erros do Prisma no terminal.

### Banco

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xnutri?schema=public
DATABASE_POOL_MAX=5
```

Explicação:

- `DATABASE_URL`: endereço do PostgreSQL.
- `DATABASE_POOL_MAX`: limite de conexões.

### Admin Manual

```env
ADMIN_EMAIL=admin@xnutri.com.br
ADMIN_PASSWORD=Admin@12345
ADMIN_NAME=Administrador XNutri
```

Usado pelo comando:

```bash
npm run admin:create
```

### Mercado Pago

```env
MERCADO_PAGO_ACCESS_TOKEN=TEST-...
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-...
MERCADO_PAGO_WEBHOOK_SECRET=
```

### Cloudinary

```env
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=sua-api-secret
CLOUDINARY_FOLDER=xnutri
```

### Correios

```env
CORREIOS_USERNAME=
CORREIOS_PASSWORD=
CORREIOS_CARTAO_POSTAGEM=
CORREIOS_CONTRATO=
CORREIOS_DR=
```

A estrutura está preparada para integração logística. O cálculo atual usa métodos de frete cadastrados no banco.

## Banco De Dados E Prisma

O schema fica em:

```text
prisma/schema.prisma
```

Principais tabelas:

- `users`
- `addresses`
- `products`
- `categories`
- `product_images`
- `product_variants`
- `inventory`
- `inventory_movements`
- `coupons`
- `orders`
- `order_items`
- `payments`
- `reviews`
- `shipping_methods`
- `pickup_locations`
- `wishlists`
- `carts`
- `cart_items`
- `admin_users`
- `audit_logs`
- `settings`
- `banners`
- `newsletter_subscribers`

### Quando Usar Cada Comando Prisma

Gerar client:

```bash
npm run db:generate
```

Criar/atualizar tabelas localmente:

```bash
npm run db:migrate
```

Aplicar migrations em produção:

```bash
npm run db:deploy
```

Popular dados iniciais:

```bash
npm run db:seed
```

Abrir painel visual do banco:

```bash
npm run db:studio
```

O Prisma Studio abre uma página para ver e editar dados do banco.

## Como Usar O Admin

### Entrar No Admin

1. Rode o site com `npm run dev`.
2. Acesse `http://localhost:3000/admin/login`.
3. Entre com:

```text
admin@xnutri.com.br
Admin@12345
```

### Criar Admin Manualmente

Se você não rodou o seed, crie um admin:

```bash
npm run admin:create -- admin@xnutri.com.br SenhaForte123
```

Ou configure no `.env`:

```env
ADMIN_EMAIL=admin@xnutri.com.br
ADMIN_PASSWORD=SenhaForte123
ADMIN_NAME=Administrador XNutri
```

E rode:

```bash
npm run admin:create
```

### Permissões

O sistema usa dois níveis:

- `users.role`: define se o usuário é `CLIENT` ou `ADMIN`.
- `admin_users.role`: define o nível dentro do painel.

Papéis administrativos:

| Papel | Acesso |
| --- | --- |
| `ADMIN` | Acesso total |
| `MANAGER` | Gestão operacional |
| `VIEWER` | Leitura de dashboard, pedidos e relatórios |

## Produtos, Categorias E Descontos

### Categorias Oficiais

Use apenas:

- `Suplementos`
- `Moda Fitness`

Mesmo que existam produtos de whey, creatina, vitaminas ou acessórios, eles devem entrar em `Suplementos`.

Produtos de moda fitness, como camiseta, legging, top e shorts, devem entrar em `Moda Fitness`.

### Cadastrar Produto Pelo Admin

1. Entre em `/admin/login`.
2. Vá em `Produtos`.
3. Clique/preencha o formulário de produto.
4. Escolha a categoria.
5. Informe nome, SKU, descrição, preço e estoque.
6. Adicione a imagem.
7. Marque se é destaque, mais vendido ou promoção.
8. Salve.

### Produto Com Desconto

Para aparecer na seção de descontos:

- Marque `Promoção`; ou
- Informe um preço anterior em `compareAtPrice` / preço antigo.

Exemplo:

```text
Preço atual: 129.90
Preço anterior: 159.90
Promoção: marcado
```

### Produtos Com Variação

Para produtos com opções, use variações.

Exemplo de opções:

```text
Chocolate
Baunilha
Preta
Grafite
```

Exemplo de atributos:

```text
sabor=Chocolate
cor=Preta
modelo=Dry Fit
```

Cada variação pode ter:

- SKU próprio.
- Estoque próprio.
- Ajuste de preço, se necessário.

### Produtos Pelo Seed

Os produtos iniciais ficam em:

```text
prisma/seed.ts
```

Para alterar produtos de demonstração:

1. Abra `prisma/seed.ts`.
2. Edite o array `products`.
3. Rode:

```bash
npm run db:seed
```

Lembrete: o seed limpa e recria dados principais. Não rode em produção com dados reais.

## Estoque

O estoque fica ligado a produtos e variações.

Quando ocorre venda paga:

- O estoque baixa.
- A disponibilidade atualiza.
- Uma movimentação é registrada.

Histórico de estoque:

```text
inventory_movements
```

### Ajustar Estoque Pelo Admin

1. Vá em `/admin/estoque`.
2. Procure o produto ou SKU.
3. Informe o novo saldo.
4. Escreva o motivo.
5. Salve.

Exemplos de motivo:

```text
Entrada de compra
Ajuste de conferência
Produto avariado
Venda presencial
```

## Cupons

O painel permite criar cupons.

Tipos comuns:

- Porcentagem.
- Valor fixo.
- Frete grátis.

Exemplo:

```text
Código: XNUTRI10
Tipo: Porcentagem
Valor: 10
Compra mínima: 100
```

Cupons criados no seed:

```text
BEMVINDO10
FRETEGRATIS
XTREINO20
```

## Frete E Retirada Na Loja

O sistema suporta:

- Correios.
- Frete manual.
- Retirada na loja.

### Retirada Na Loja

Quando o cliente escolhe retirada:

- Não cobra frete.
- O checkout destaca a retirada.
- O pedido gera protocolo.
- O cliente vê instruções.

Ponto de retirada criado pelo seed:

```text
XNutri Mirassol
Mirassol-SP
```

### Frete Manual

O frete manual serve para cidades/regiões atendidas pela loja.

Exemplo de configuração:

```json
{
  "cities": ["Mirassol", "São José do Rio Preto", "Bálsamo"]
}
```

### Validação De CEP

A rota de CEP fica em:

```text
/api/cep/[cep]
```

Ela é usada para ajudar o checkout e estimativas.

## Mercado Pago

O projeto já tem estrutura para Mercado Pago.

Rotas:

```text
/api/payments/mercado-pago/preference
/api/payments/mercado-pago/webhook
```

### Configurar Mercado Pago

1. Entre na sua conta Mercado Pago.
2. Acesse o painel de desenvolvedor.
3. Crie uma aplicação.
4. Copie as credenciais de teste.
5. Cole no `.env`:

```env
MERCADO_PAGO_ACCESS_TOKEN=TEST-...
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-...
```

Para produção, use credenciais reais, normalmente iniciadas com `APP_USR`.

### Webhook

Webhook é a URL que o Mercado Pago chama para avisar que o pagamento mudou de status.

Local:

```text
http://localhost:3000/api/payments/mercado-pago/webhook
```

Produção:

```text
https://seudominio.com.br/api/payments/mercado-pago/webhook
```

Para testar webhook localmente, use ngrok:

```bash
ngrok http 3000
```

Depois configure no Mercado Pago:

```text
https://seu-link-ngrok.ngrok-free.app/api/payments/mercado-pago/webhook
```

### Fluxo De Pagamento

1. Cliente finaliza checkout.
2. Sistema cria o pedido.
3. Sistema cria preferência no Mercado Pago.
4. Cliente paga por PIX ou cartão.
5. Mercado Pago chama o webhook.
6. Sistema atualiza o pagamento.
7. Sistema atualiza o pedido.
8. Sistema baixa estoque quando aprovado.

## Cloudinary

O Cloudinary é usado para upload e hospedagem de imagens.

### Criar Conta

1. Acesse https://cloudinary.com.
2. Crie uma conta.
3. Copie:
   - Cloud name.
   - API key.
   - API secret.

### Configurar `.env`

```env
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=sua-api-secret
CLOUDINARY_FOLDER=xnutri
```

### Upload No Admin

O admin possui rota preparada:

```text
/api/admin/uploads/cloudinary
```

Se as variáveis não estiverem configuradas, uploads reais podem falhar. Nesse caso, use URL de imagem externa temporariamente.

## SEO

O projeto inclui:

- Metadata do Next.js.
- Open Graph.
- Sitemap.
- Robots.
- URLs amigáveis.
- JSON-LD.

Rotas:

```text
/sitemap.xml
/robots.txt
```

Configure corretamente:

```env
NEXT_PUBLIC_APP_URL=https://seudominio.com.br
```

Isso evita sitemap e Open Graph apontando para `localhost`.

## Deploy

### Opção Recomendada

- Vercel para Next.js.
- Neon, Supabase ou Railway para PostgreSQL.
- Cloudinary para imagens.
- Mercado Pago para pagamentos.

### Passo A Passo Geral

1. Suba o projeto para GitHub.
2. Crie um banco PostgreSQL online.
3. Copie a `DATABASE_URL` do banco.
4. Configure as variáveis de ambiente na hospedagem.
5. Configure `NEXT_PUBLIC_APP_URL` com a URL real.
6. Rode migrations em produção.
7. Crie o admin.
8. Configure Mercado Pago e webhook.
9. Teste compra completa.

### Deploy Na Vercel

1. Acesse https://vercel.com.
2. Importe o repositório.
3. Em `Environment Variables`, cadastre as variáveis do `.env`.
4. Faça o deploy.
5. Rode localmente apontando para o banco de produção, ou no terminal da hospedagem:

```bash
npm run db:deploy
```

6. Crie admin:

```bash
npm run admin:create -- admin@xnutri.com.br SenhaForte123
```

Importante:

- Em produção use `npm run db:deploy`, não `npm run db:migrate`.
- Não rode `npm run db:seed` em produção com pedidos reais.

### Build Local Antes Do Deploy

Antes de publicar, rode:

```bash
npm run lint
npm run build
```

Se esses comandos passarem, a chance de o deploy funcionar é bem maior.

## Erros Comuns

### `DATABASE_URL precisa estar definida`

O projeto não achou a variável do banco.

Confira:

1. Existe um arquivo `.env`?
2. Ele tem `DATABASE_URL`?
3. Você está rodando o comando dentro da pasta correta?

Exemplo:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xnutri?schema=public
```

### `ECONNREFUSED`

O banco não está rodando.

Rode:

```bash
docker compose up -d
```

Depois:

```bash
npm run db:migrate
```

### Porta 5432 Já Está Em Uso

Você já tem outro PostgreSQL rodando.

Opções:

- Parar o outro PostgreSQL.
- Alterar a porta no `docker-compose.yml`.
- Alterar a porta na `DATABASE_URL`.

Exemplo usando porta `5433`:

```yaml
ports:
  - "5433:5432"
```

E no `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/xnutri?schema=public
```

### Tabela Não Existe

As migrations ainda não foram aplicadas.

Rode:

```bash
npm run db:migrate
```

Em produção:

```bash
npm run db:deploy
```

### Admin Volta Para Login

Confira:

- O usuário existe em `users`.
- O usuário tem `role = ADMIN`.
- Existe registro em `admin_users`.
- `admin_users.active = true`.

Mais fácil: recrie o admin.

```bash
npm run admin:create -- admin@xnutri.com.br SenhaForte123
```

### Não Vejo Produtos No Site

Rode:

```bash
npm run db:seed
```

Depois reinicie:

```bash
npm run dev
```

Lembrete: o seed limpa dados principais. Use em ambiente local ou banco vazio.

### Imagens Não Sobem

Confira Cloudinary:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Se estiver vazio, o upload real não vai funcionar.

### Mercado Pago Não Redireciona

Confira:

```env
MERCADO_PAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
NEXT_PUBLIC_APP_URL=
```

Em produção, `NEXT_PUBLIC_APP_URL` precisa ser o domínio real com HTTPS.

### Webhook Não Chega Localmente

`localhost` não é acessível pelo Mercado Pago.

Use ngrok:

```bash
ngrok http 3000
```

Configure a URL gerada no painel Mercado Pago.

### Build Falha Por Causa Do Prisma

Geralmente o banco não recebeu migrations.

Local:

```bash
npm run db:migrate
```

Produção:

```bash
npm run db:deploy
```

### Site Abre Em Branco Ou Com Erro

Tente:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Se ainda falhar, olhe o terminal. A mensagem de erro costuma apontar a causa.

## Comandos Úteis

Instalar dependências:

```bash
npm install
```

Rodar desenvolvimento:

```bash
npm run dev
```

Validar código:

```bash
npm run lint
```

Gerar build:

```bash
npm run build
```

Rodar build já gerado:

```bash
npm run start
```

Gerar Prisma Client:

```bash
npm run db:generate
```

Criar migrations localmente:

```bash
npm run db:migrate
```

Aplicar migrations em produção:

```bash
npm run db:deploy
```

Popular banco:

```bash
npm run db:seed
```

Abrir Prisma Studio:

```bash
npm run db:studio
```

Criar admin:

```bash
npm run admin:create -- admin@xnutri.com.br SenhaForte123
```

Subir banco local:

```bash
docker compose up -d
```

Parar banco local:

```bash
docker compose down
```

Parar banco e apagar volume local:

```bash
docker compose down -v
```

Atenção: `docker compose down -v` apaga as informações salvas no PostgreSQL local.

## Checklist Antes De Produção

- Trocar senha do admin.
- Usar `AUTH_SECRET` forte.
- Usar PostgreSQL online.
- Configurar `NEXT_PUBLIC_APP_URL` com domínio real.
- Configurar Cloudinary.
- Configurar Mercado Pago de produção.
- Configurar webhook Mercado Pago.
- Rodar `npm run db:deploy`.
- Criar admin real.
- Cadastrar produtos reais.
- Revisar estoque.
- Revisar cupons.
- Revisar frete manual.
- Revisar retirada na loja.
- Revisar páginas institucionais.
- Testar compra com entrega.
- Testar compra com retirada.
- Testar pagamento PIX.
- Testar pagamento cartão.
- Testar e-mail/contato se for integrado depois.
- Rodar `npm run lint`.
- Rodar `npm run build`.

## Ordem Mais Simples Para Iniciantes

Se você só quer colocar para rodar localmente no PowerShell, siga exatamente:

```powershell
cd C:\Users\Sharif\Downloads\xnutri
npm install
docker compose up -d
Copy-Item .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Depois abra:

```text
http://localhost:3000
```

E para administrar:

```text
http://localhost:3000/admin/login
```

Login:

```text
admin@xnutri.com.br
Admin@12345
```
