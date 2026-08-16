# Tutorial definitivo da XNutri — instalação, integrações, segurança e Vercel

Este é o único tutorial oficial do projeto. Ele substitui os tutoriais antigos de instalação, produção, Hostinger, Mercado Pago, Cloudinary, Google, PDV e deploy. A aplicação deve ser publicada exclusivamente na Vercel, usa PostgreSQL/Neon e está preparada para PagBank.

Nunca coloque senha, token, `DATABASE_URL` real ou chave de API neste arquivo, no GitHub, em prints ou em conversas. Os exemplos abaixo são intencionalmente falsos.

## 0. Como usar este guia se você está começando

Você não precisa saber tudo de programação para seguir este passo a passo. Faça uma seção por vez e só avance quando o teste indicado passar. Sempre que este guia disser **PowerShell**, é um comando para ser executado no terminal do Windows. Sempre que disser **arquivo**, é um texto que deve ser colado no arquivo indicado — não no terminal.

### A regra mais importante

- Nunca copie uma senha, token ou URL de banco para o GitHub, para este guia ou para um print.
- Nunca use o banco Production para testes.
- Nunca rode `prisma migrate reset`, `db push --force-reset` ou o seed em um banco que já tenha vendas.
- Se um comando falhar, pare, copie apenas a mensagem do erro (sem segredos) e consulte a seção **Erros comuns**.
- Depois de alterar uma variável na Vercel, sempre faça um novo **Redeploy**. O deploy antigo não recebe a variável nova.

### Glossário rápido

| Termo | Explicação simples |
| --- | --- |
| Projeto | A pasta do código da XNutri no seu computador e o projeto correspondente na Vercel |
| Node.js/npm | Programa e gerenciador que executam o Next.js e instalam dependências |
| Next.js | Framework que entrega a loja, o admin e as APIs |
| PostgreSQL | Banco onde ficam produtos, clientes, pedidos e estoque |
| Docker | PostgreSQL descartável para desenvolvimento local; não é o banco da loja publicada |
| Neon | Serviço de PostgreSQL online usado por Preview/Production |
| Prisma | Camada que permite ao código conversar com o PostgreSQL |
| Migration | Arquivo versionado que altera o formato do banco sem apagar os dados |
| Seed | Dados iniciais; neste projeto pode apagar dados e só serve para banco novo/teste |
| Vercel | Hospedagem da aplicação Next.js e das Functions |
| Preview | Cópia temporária para testar uma branch antes de Production |
| Production | Site público real |
| Variável de ambiente | Configuração guardada fora do código, como senha do banco ou token |
| Webhook | Aviso que o PagBank envia ao servidor quando o pagamento muda |
| PWA | Atalho instalável do painel admin; não é um aplicativo nativo de loja |

### Caminho recomendado para a primeira configuração

Siga exatamente esta ordem:

1. Instalar Node.js, Git e Docker Desktop.
2. Abrir a pasta correta do projeto.
3. Criar `.env.local` sem colocar esse arquivo no Git.
4. Ligar o PostgreSQL Docker e executar migrations locais.
5. Criar o administrador local.
6. Rodar a loja e testar login, produto, carrinho, checkout, admin e PDV.
7. Criar o banco Preview no Neon.
8. Configurar variáveis Preview na Vercel e fazer um Preview Deployment.
9. Testar PagBank Sandbox e Cloudinary no Preview.
10. Rotacionar/configurar o banco Production, publicar e fazer uma compra pequena controlada.

Se você ainda não possui contas externas, faça primeiro as seções locais. A loja funciona localmente sem PagBank e Cloudinary, mas essas integrações precisam estar configuradas antes de vender no site publicado.

### Índice rápido

- Começando e glossário: seção 0
- O que já está pronto e o que falta: seção 1
- Instalação local: seções 3–5
- Variáveis, Neon e migrations: seções 6–7
- Vercel, Preview e domínio: seção 8 e 16
- PagBank, Cloudinary e Google: seções 9–11
- Frete, admin, estoque e PDV: seções 12–14
- Testes, erros e checklist: seções 15, 18 e 19

## 1. O que falta fazer agora

Última conferência prática: **16/08/2026**. O código, o banco isolado de testes, a conta Vercel, o projeto Neon, o Cloudinary e a configuração Google foram verificados. Nenhum valor secreto foi copiado para este documento.

### Situação atual comprovada

- GitHub conectado ao projeto Vercel `x-nutri-mirassol-novo`.
- O último deploy de Production falhou antes do build porque faltavam `CRON_SECRET` e `PAGBANK_TOKEN`.
- A versão antiga que ainda recebe o domínio da Vercel retorna `500/503` porque usava credenciais antigas do Neon (`P1000`). `DATABASE_URL` e `DIRECT_URL` já foram substituídas na configuração de Production, mas a correção só entra em vigor em um novo deploy.
- `CRON_SECRET` e as credenciais já existentes do Cloudinary foram configuradas em Production. A conexão com o Cloudinary respondeu com sucesso.
- O Neon está acessível e possui dados, porém existem **seis migrations não aplicadas**. Elas foram revisadas e não apagam tabelas nem registros; ainda precisam ser aplicadas com `npm run db:deploy` após backup/confirmação.
- O Google Cloud já possui um cliente OAuth chamado XNutri. O callback ainda precisa incluir o domínio real da Vercel e um novo secret precisa ser armazenado na Vercel, pois o secret antigo não pode mais ser visualizado.
- O portal PagBank não estava autenticado no navegador. `PAGBANK_TOKEN` continua pendente e impede corretamente um deploy novo de Production.
- Preview ainda não possui variáveis. Crie uma branch Neon separada antes de preencher `DATABASE_URL` e `DIRECT_URL` de Preview.
- Validação local de 16/08/2026: `npm audit` com 0 vulnerabilidades, Prisma válido, TypeScript e ESLint aprovados, 45/45 testes unitários/componentes, 34/34 E2E e build Next.js aprovado.

### Já está pronto no código

- Loja pública, catálogo, produto, carrinho e checkout.
- Área do cliente, login por e-mail/senha e suporte opcional ao Google.
- Admin com produtos, categorias, estoque, cupons, pedidos, clientes, banners, entregas, financeiro, relatórios e auditoria.
- PDV com caixa, vendas, pagamentos, comprovante e movimentação de estoque.
- Prisma/PostgreSQL, migrations e conexão serverless com URL pooler.
- Reserva de estoque durante pagamento, liberação oportunista no carrinho/checkout, cron diário de segurança e baixa idempotente.
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

1. Fazer backup do Neon e aplicar as seis migrations pendentes com `npm run db:deploy`.
2. Rotacionar a senha do Neon, pois uma connection string real já foi compartilhada fora do painel seguro. Depois, atualizar `DATABASE_URL` e `DIRECT_URL` localmente e na Vercel.
3. Criar um banco/branch Neon separado para Preview. Preview não deve usar o banco de Production.
4. Configurar todas as variáveis de Preview e confirmar que elas não apontam para Production.
5. Entrar no Portal do Desenvolvedor PagBank, obter a credencial Sandbox e configurar `PAGBANK_ENVIRONMENT=sandbox` e `PAGBANK_TOKEN` somente no Preview.
6. Validar pagamento e webhook no PagBank Sandbox; depois obter/configurar credencial de Production.
7. Corrigir o callback Google, criar novo secret do cliente e configurar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` na Vercel.
8. Fazer um Preview Deployment e testar loja, admin, PDV, checkout, estoque, upload e PagBank.
9. Confirmar domínio final e deixar `NEXT_PUBLIC_APP_URL`, `AUTH_URL` e `NEXTAUTH_URL` iguais ao domínio HTTPS.
10. Cadastrar/revisar produtos, imagens, endereço, horários, fretes, retirada e dados reais da loja.
11. Promover para Production somente depois do Preview aprovado; conferir `/api/health` e fazer uma compra pequena controlada.
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

Crie ou tenha acesso a [GitHub](https://github.com), [Vercel](https://vercel.com), [Neon](https://neon.tech), [PagBank](https://pagbank.com.br), [Cloudinary](https://cloudinary.com) e, opcionalmente, [Google Cloud](https://console.cloud.google.com).

Instale Node.js 20.19+ ou 22.12+ LTS, npm 10+, Git e Docker Desktop. Confirme no PowerShell:

```powershell
node --version
npm --version
git --version
docker --version
```

Evite Node experimental quando possível. Para operação diária, prefira uma versão LTS compatível.

### Como instalar no Windows

1. Instale Node.js LTS pelo site oficial e reabra o PowerShell.
2. Instale Git com as opções padrão.
3. Instale Docker Desktop, abra-o e espere aparecer **Engine running**.
4. Reinicie o computador se o Docker solicitar.
5. Execute os quatro comandos acima. Se `node`, `npm`, `git` ou `docker` não forem reconhecidos, o programa não foi instalado no PATH; reinstale-o e reabra o terminal.

### Conferir se você está na pasta certa

Antes de qualquer comando do projeto:

```powershell
Set-Location "C:\Users\Sharif\Downloads\xnutri"
Get-Location
Test-Path .\package.json
```

O último comando precisa mostrar `True`. Se mostrar `False`, você está em outra pasta. Não crie outro projeto: localize a pasta que contém `package.json`, `prisma` e `src`.

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

`npm ci` instala exatamente as versões registradas no `package-lock.json`. Na primeira instalação pode demorar alguns minutos. Avisos de pacotes opcionais não são necessariamente erros; o comando só falhou se terminar com `npm ERR!` e código diferente de zero.

Para abrir um arquivo no Bloco de Notas, use, por exemplo:

```powershell
notepad .env.local
```

Para abrir o projeto no VS Code, se ele estiver instalado:

```powershell
code .
```

Crie `.env.local` apenas se ele ainda não existir:

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

`.env.local` é o arquivo local da sua máquina. Ele é ignorado pelo Git e não deve ser enviado para a Vercel. O arquivo `.env.example` contém apenas nomes e exemplos seguros; não substitua o `.env.local` preenchido por ele depois de configurar suas credenciais.

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

Se o arquivo já tiver outras linhas, mantenha-as. Edite somente o valor depois do sinal `=`. Não coloque espaços antes do nome da variável e não use aspas no endereço local. Em URLs do Neon, mantenha a URL inteira em uma única linha.

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

O que cada comando faz:

- `docker compose up -d`: inicia o banco local em segundo plano.
- `docker compose ps`: mostra se o container está `running`.
- `npm run db:generate`: gera o cliente Prisma usado pelo código.
- `npm run db:validate`: verifica se o schema está válido.
- `npm run db:deploy`: aplica migrations existentes sem apagar dados.

Se `docker compose ps` não mostrar o PostgreSQL ativo, abra o Docker Desktop e repita. Se aparecer `port is already allocated`, existe outro PostgreSQL usando a porta; pare somente o serviço que você reconhece ou peça ajuda antes de mudar a porta do projeto.

Crie o dono sem apagar dados:

```powershell
npm run admin:create -- "SEU_EMAIL" "SUA_SENHA_FORTE" "Dono da XNutri"
```

Substitua os três valores. O `--` separa os argumentos do npm e é obrigatório. Exemplo de formato (não use esta senha):

```powershell
npm run admin:create -- "voce@seudominio.com.br" "SuaSenhaForte#Troque123" "Dono da XNutri"
```

Se aparecer `Use: npm run admin:create -- ...`, faltou e-mail ou senha no comando. Se aparecer erro de banco, confira se o Docker está ligado e se `DATABASE_URL` aponta para `localhost` localmente.

A senha precisa ter de 12 a 128 caracteres, maiúscula, minúscula, número e símbolo. Não use a senha mostrada em mensagens antigas.

Inicie e acesse:

```powershell
npm run dev
```

Enquanto esse comando estiver rodando, não feche essa janela. Para parar o servidor, pressione `Ctrl+C`. Se a porta 3000 estiver ocupada, o Next poderá escolher outra porta; use o endereço exibido no terminal.

```text
Loja:  http://localhost:3000
Admin: http://localhost:3000/admin/login
PDV:   http://localhost:3000/pdv/login
Saúde: http://localhost:3000/api/health
```

Para parar o banco: `docker compose stop`.

### Seed local: somente em banco descartável

Seed significa “popular o banco com dados iniciais”. Neste projeto ele pode limpar/recriar produtos, categorias, cupons e contas de teste. Por isso, use-o somente em um banco local novo ou no banco E2E. Não execute em Production, Preview com dados importantes ou qualquer banco que já tenha vendas.

Em banco local novo:

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

Depois do seed, entre com a conta criada e verifique `/`, `/catalogo`, `/admin/login` e `/pdv/login`. O seed não substitui produtos reais, fotos reais, endereço da loja ou credenciais de pagamento.

## 6. Variáveis de ambiente

### Regras

- Local: `.env.local`, ignorado pelo Git.
- Vercel: painel ou CLI, nunca arquivo commitado.
- Production e Preview usam segredos e bancos diferentes.
- Somente `NEXT_PUBLIC_` chega ao navegador.
- Nunca torne banco, token ou secret público.
- Na Vercel, cole valores sem aspas extras.

### Como preencher sem se confundir

1. No computador, edite `.env.local`.
2. Na Vercel, abra **Settings → Environment Variables → Add New**.
3. Digite o nome exatamente, por exemplo `DATABASE_URL`.
4. Cole somente o valor no campo **Value** — não cole `DATABASE_URL=` junto.
5. Escolha o ambiente: **Development**, **Preview** ou **Production**.
6. Salve e faça Redeploy.

Uma variável marcada somente em **Production** não existe em Preview. Isso é intencional para evitar que testes usem o banco real. Variáveis com `NEXT_PUBLIC_` podem chegar ao navegador; todas as demais devem ser tratadas como privadas. Nunca coloque `AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `PAGBANK_TOKEN` ou `CLOUDINARY_API_SECRET` com prefixo `NEXT_PUBLIC_`.

### Checklist mínimo por ambiente

| Ambiente | Banco | PagBank | Uso |
| --- | --- | --- | --- |
| Local | Docker `xnutri` | vazio/sandbox opcional | Desenvolvimento na sua máquina |
| Preview | Neon branch/banco separado | Sandbox | Testes antes da publicação |
| Production | Neon Production | Production | Clientes reais |

Nunca copie o `DATABASE_URL` de Production para Preview ou para um tutorial. Se uma senha aparecer em chat, print ou commit, considere-a comprometida e faça rotação no provedor.

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

Pense no banco como a planilha principal da loja. A Vercel executa o site, mas não guarda o banco no disco dela. O Neon guarda os dados e o Prisma traduz o código para consultas PostgreSQL. `DATABASE_URL` é usada pela aplicação; `DIRECT_URL` é preferida para migrations porque não passa pelo pooler.

### Criar um banco Neon para iniciante

1. Acesse o Neon e crie um projeto PostgreSQL.
2. Crie uma branch chamada `preview` para testes e mantenha a branch Production separada.
3. No botão **Connect**, escolha a connection string pooler para `DATABASE_URL` e a conexão direta para `DIRECT_URL`.
4. Copie cada URL sem publicar. Em geral elas terminam com `sslmode=require`; o projeto aceita essa forma, mas recomenda `sslmode=verify-full` quando o painel oferecer.
5. Teste primeiro localmente com o banco Preview, nunca com o banco de clientes.

### O que é uma migration

Migration é uma mudança versionada no formato do banco, como adicionar uma coluna para idempotência. O comando seguro em Preview/Production é:

```powershell
npm run db:deploy
```

Ele aplica migrations pendentes e não apaga registros. `npm run db:migrate` é para desenvolver uma mudança nova localmente; `npm run db:status` mostra se há migration pendente. Se o banco online já tem vendas, faça backup e teste a migration em Preview antes de Production.

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

Isso significa que o build da Vercel bloqueia uma publicação com banco/Auth/PagBank incompletos e aplica migrations pendentes. Não rode `npm run vercel-build` apontando acidentalmente para o banco Production no seu computador: para desenvolvimento use `npm run build`; migrations Production devem acontecer pelo deploy controlado após backup.

Antes de migration em Production: backup, teste em Preview, revisão do SQL e plano de rollback. Nunca use `prisma migrate reset`, `db push --force-reset` ou seed em Production.

### Criar o dono no banco online

Depois das migrations, coloque temporariamente as URLs atualizadas do Neon em `.env.local` e rode:

```powershell
npm run admin:create -- "EMAIL_DO_DONO" "SENHA_FORTE_EXCLUSIVA" "Dono da XNutri"
```

O comando cria/atualiza apenas esse usuário como `ADMIN`; não apaga loja nem pedidos. Depois, restaure as URLs locais se voltar ao Docker.

## 8. Configurar a Vercel

A Vercel é onde o site ficará publicado. O banco, PagBank e Cloudinary continuam sendo serviços separados. Você não precisa instalar Docker na Vercel.

### Primeiro deploy pelo painel

1. Entre na Vercel e clique **Add New → Project**.
2. Importe o repositório GitHub correto da XNutri.
3. Confirme que o framework detectado é **Next.js**.
4. Deixe **Install Command** como `npm ci` e **Build Command** como `npm run vercel-build`.
5. Não clique em Deploy ainda se as variáveis obrigatórias não estiverem prontas.
6. Abra **Settings → Environment Variables** e cadastre as variáveis da tabela abaixo.
7. Para começar, marque **Preview** com banco Preview e PagBank Sandbox.
8. Faça o primeiro deploy e abra a URL `.vercel.app` gerada.

O primeiro deploy pode falhar propositalmente se faltar banco, `AUTH_SECRET`, `CRON_SECRET` ou `PAGBANK_TOKEN`. Isso significa que a proteção de produção funcionou; configure a variável indicada e faça Redeploy.

### Adicionar variáveis pelo painel

1. Abra o projeto XNutri na Vercel.
2. Acesse **Settings → Environment Variables**. A tela pode aparecer dentro de **Environments**.
3. Clique **Add New** ou **Add Variable**.
4. Digite o nome exatamente como neste guia.
5. Cole somente o valor, sem aspas e sem o nome da variável.
6. Marque o ambiente correto: Preview ou Production.
7. Salve e repita para cada variável.
8. Vá para **Deployments**, abra o último deploy e escolha **Redeploy**; deployment antigo não recebe variável nova.

Depois do deploy, abra `/api/health`. Uma resposta HTTP 200 indica que a Function respondeu; ela não substitui o teste de login, banco e checkout.

### Pelo terminal

Se você preferir o terminal, o `npx` baixa a CLI sem precisar instalar globalmente:

```powershell
npx vercel login
npx vercel link
```

Escolha a conta e o projeto corretos quando a CLI perguntar. Se você é iniciante, use o painel da seção anterior; ele é mais visual e produz o mesmo resultado.

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

O primeiro resultado será o `AUTH_SECRET`; o segundo será o `CRON_SECRET`. Copie somente cada linha gerada para o campo **Value** correspondente. Não use a mesma chave nos dois campos e não salve esses resultados neste arquivo.

### Conferência remota obrigatória

O código não consegue provar quais valores estão hoje no painel remoto. Confira em **Settings > Environments > Production** e em **Preview**. No histórico do projeto, banco e Auth já haviam sido adicionados; trate isso como informação a reconfirmar, não como validação atual.

Confirme especialmente:

- `CRON_SECRET`.
- `PAGBANK_ENVIRONMENT` e `PAGBANK_TOKEN`.
- `PAGBANK_WEBHOOK_TOKEN`, se houver segredo separado.
- As três credenciais `CLOUDINARY_*`.
- Google, se usar.
- Todas as variáveis de Preview.

Para Preview sem domínio estável, use a URL `.vercel.app` mostrada no deployment e configure as URLs correspondentes quando o projeto exigir domínio público. Para Google em Preview, cadastre o callback exato. Nunca use banco Production no Preview.

## 9. PagBank

Novos pagamentos usam PagBank. As rotas antigas de Mercado Pago retornam `410` para impedir uso acidental.

O cliente paga em uma página hospedada pelo PagBank; o navegador não envia cartão para o banco da XNutri. A XNutri cria o checkout e aguarda o webhook assinado. Por isso, configurar somente o botão ou somente o retorno do navegador não basta.

### Sandbox

1. Crie/abra uma aplicação PagBank e escolha o ambiente Sandbox.
2. Copie o token Sandbox para um local privado; nunca o coloque no código.
3. Configure `PAGBANK_ENVIRONMENT=sandbox` e `PAGBANK_TOKEN` no ambiente Preview da Vercel.
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

Se o PagBank pedir um token/segredo de autenticidade, coloque-o em `PAGBANK_WEBHOOK_TOKEN`. Se ele não fornecer um segredo separado, o código usa `PAGBANK_TOKEN` como fallback. O endpoint exige o cabeçalho `x-authenticity-token`.

O webhook exige `x-authenticity-token`, valida corpo bruto, referência, BRL e total. O retorno do navegador nunca aprova pedido sozinho.

### Production

Depois do Sandbox:

1. Troque `PAGBANK_ENVIRONMENT=production` somente em Production.
2. Use token real.
3. Confirme webhook no domínio HTTPS.
4. Faça Redeploy.
5. Realize compra real pequena e confira gateway, pedido, estoque e auditoria.

Se o pagamento abre mas o pedido continua pendente, consulte primeiro **Vercel → Logs** e depois **Admin → Auditoria**. Não altere manualmente o status para “pago” para contornar um webhook; descubra a causa e reenvie o evento pelo provedor.

Nunca use token Sandbox em Production nem armazene cartão/CVV.

## 10. Cloudinary

Cloudinary guarda imagens fora do disco temporário da Vercel. Sem ele, o cadastro ainda pode funcionar com URLs existentes, mas o botão de upload do admin retorna indisponível.

1. Crie uma conta no Cloudinary e abra **Dashboard**.
2. Copie **Cloud Name**, **API Key** e **API Secret**.
3. Adicione as três variáveis na Vercel:
2. Adicione na Vercel:

```env
CLOUDINARY_CLOUD_NAME=SEU_CLOUD_NAME
CLOUDINARY_API_KEY=SUA_API_KEY
CLOUDINARY_API_SECRET=SEU_API_SECRET
CLOUDINARY_FOLDER=xnutri
```

4. Use `xnutri-preview` em Preview e faça Redeploy.
5. Entre em `/admin/produtos`, abra **Adicionar produto**, escolha **Selecionar arquivo**, selecione uma foto do computador e aguarde a mensagem de sucesso.
6. Confirme que o campo de imagem recebeu uma URL começando com `https://res.cloudinary.com/`.
7. Repita o teste em **Admin → Banners** se essa área for usada.

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
- A reserva vence após 30 minutos. Carrinho/checkout limpam pendências vencidas durante o uso normal; o cron diário funciona como garantia adicional.

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

### Roteiro manual para quem está começando

Faça este roteiro em Preview ou local antes de vender:

1. Abra a home e confirme que o logo, menu, busca e carrinho aparecem.
2. Abra **Catálogo**, pesquise `creatina` e entre em um produto.
3. Clique **Adicionar ao carrinho**; depois abra o carrinho e aumente a quantidade.
4. Remova o item e confirme que o carrinho vazio é explicado.
5. Adicione novamente, escolha **Retirar na loja** e confirme que o frete é zero.
6. Abra o checkout, deixe um campo vazio e clique **Finalizar pedido**. A tela deve apontar o campo que falta sem apagar os demais.
7. Para entrega, informe um CEP válido, pressione **Enter** e confirme que a seleção e os dados continuam preenchidos.
8. Finalize um pedido fictício. Anote o número exibido e abra a página de pedido somente pela sessão/token correto.
9. Entre em `/admin/login` com o dono. Abra produtos, altere um preço de teste e confirme que o editor fecha após salvar.
10. Entre com uma conta `CASHIER` e confirme que ela acessa apenas o PDV.
11. Abra uma janela anônima e tente `/admin`, `/pdv` e o pedido de outra pessoa. O acesso deve ser bloqueado.

Se qualquer passo falhar, registre: URL, perfil usado, horário, mensagem visível e código de suporte. Não envie senha, token ou URL completa de banco.

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

### Como interpretar o resultado

- `npm audit` precisa terminar com `found 0 vulnerabilities`.
- `db:validate` precisa dizer que o schema é válido.
- `typecheck` e `lint` terminam sem linhas de erro.
- `npm run test` mostra `Tests ... passed`.
- `npm run test:e2e` inicia o Docker/test database e abre navegadores automatizados; não o execute apontando para Production.
- `npm run build` precisa terminar com a lista de rotas e sem `Failed to compile`.

Comandos úteis antes de pedir ajuda:

```powershell
git status
npm run db:status
npm run production:check
```

`git status` mostra arquivos alterados; não envie `.env.local`. `db:status` mostra migrations pendentes. `production:check` explica qual variável impede o deploy sem revelar o seu valor.

Última evidência detalhada, com data, quantidade e limitações, está em `docs/AUDITORIA_COMPLETA_2026-08-15.md`. Não substitua a validação do Preview e dos serviços externos por resultados locais.

Na rodada de 15/08/2026: audit com 0 vulnerabilidades conhecidas, Prisma/tipos/lint/build aprovados, 45/45 testes unitários/componentes e 33/33 execuções E2E aprovadas. Depois dos ajustes finais de webhook e Vercel Hobby, a suíte focal da loja passou 10/10.

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

A hospedagem da aplicação é somente a Vercel. Hostinger, Railway, Render e VPS não fazem parte do procedimento oficial deste projeto. Neon, PagBank e Cloudinary são serviços externos de dados/pagamento/imagem, não hospedagens paralelas do Next.js.

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

Para abrir uma branch pelo terminal:

```powershell
git switch -c teste/preview-xnutri
git add .
git commit -m "prepara teste de preview"
git push -u origin teste/preview-xnutri
```

O push cria um Preview quando o repositório está conectado à Vercel. Se você não conhece Git ainda, faça as mesmas ações pelo GitHub Desktop: **Current Branch → New Branch**, depois **Commit** e **Push origin**.

Antes de promover um Preview, confirme a URL do banco no ambiente e faça um pedido fictício. Se a tela mostrar produção, pare imediatamente e remova a variável incorreta do Preview.

### Production

1. Faça merge.
2. Confira deployment/logs.
3. Abra `/api/health`.
4. Faça compra real pequena.
5. Confira PagBank, pedido, estoque e auditoria.
6. Monitore 5xx/webhook.

Na Vercel, um deployment com erro não substitui automaticamente o site anterior. Corrija a variável/código, faça novo commit ou **Redeploy** e só depois use **Promote to Production**. Se um código novo quebrar a loja, use **Deployments → deployment anterior → Promote** para voltar o código; não reverta migrations do banco sem plano de rollback e backup.

### Configurar domínio próprio

1. Na Vercel, abra **Settings → Domains → Add** e informe seu domínio.
2. A Vercel mostrará os registros DNS necessários.
3. Abra o painel onde comprou o domínio e crie exatamente os registros mostrados pela Vercel.
4. Aguarde a validação e confirme que o domínio abre em HTTPS.
5. Só depois atualize `NEXT_PUBLIC_APP_URL`, `AUTH_URL` e `NEXTAUTH_URL` com o domínio final, sem `/` no final, e faça Redeploy.

Não copie registros DNS de outro tutorial: eles variam conforme o domínio e a Vercel informa os valores corretos para o seu projeto.

O `vercel.json` usa `npm ci`, `npm run vercel-build` e um cron diário às `06:00 UTC` (`0 6 * * *`), aceito no Hobby. Nesse plano a Vercel pode iniciar o cron em qualquer momento dentro dessa hora. A expiração comercial continua em 30 minutos porque carrinho e checkout executam limpeza oportunista; o cron diário é apenas a garantia para períodos sem tráfego. Não volte para `*/10 * * * *` sem mudar para o plano Pro.

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
| `AUTH_SECRET não foi configurada` | Gere o valor pelo comando desta seção, cole somente o resultado em **Value** e faça Redeploy. |
| `Configuração de produção inválida` | Leia cada linha iniciada por `ERRO:`; o script está dizendo exatamente qual variável falta ou contém exemplo. |
| `Hobby accounts are limited to daily cron jobs` | Este projeto já usa `0 6 * * *`; confirme que o commit com [vercel.json](../vercel.json) foi enviado e faça um novo deploy. |
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
| Estoque fica reservado | Faça uma mutação de carrinho/checkout, confira o cron diário, `CRON_SECRET` e os eventos `order.reservation.expired`. |
| E2E `ECONNREFUSED 5432` | Abra Docker e `docker compose up -d`. |
| `Use: npm run admin:create ...` | Execute o comando com e-mail, senha e nome depois de `--`; não execute apenas `npm run admin:create`. |
| `Prisma Client did not initialize` | Confira `DATABASE_URL`, rode `npm ci` e `npm run db:generate`; não copie o import de outro tutorial. |
| `P1001 Can't reach database server` | No local, ligue Docker; na Vercel, confira URL Neon, TLS, ambiente e se não colocou a URL Preview em Production. |
| Página “não foi possível carregar esta parte” | Copie o código de suporte, abra os logs da Vercel e verifique banco/variáveis; não mostre stack trace ao cliente. |
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
- [ ] Limpeza no carrinho/checkout e cron diário liberam reservas vencidas.
- [ ] Audit, Prisma, tipos, lint, unitários, E2E e build aprovados.
- [ ] Mobile 360 px, tablet e desktop aprovados.
- [ ] Preview aprovado antes de Production.

## 20. Ordem curta para terminar

```text
1. Fazer backup e aplicar as 6 migrations pendentes no Neon.
2. Rotacionar a senha do Neon e atualizar as duas URLs sem mostrá-las.
3. Criar uma branch Neon exclusiva para Preview.
4. Configurar as variáveis Preview na Vercel.
5. Corrigir Google OAuth e guardar ID/secret na Vercel.
6. Entrar no PagBank, configurar Sandbox no Preview e validar webhook.
7. Publicar e aprovar o Preview.
8. Configurar o PagBank Production e o domínio definitivo.
9. Revisar o primeiro ADMIN e os dados reais da loja.
10. Promover para Production, conferir /api/health e fazer compra controlada.
11. Rotacionar periodicamente segredos, testar backup/restore e monitorar logs.
```

Os tutoriais antigos contraditórios foram removidos; este é o único passo a passo operacional. Os documentos em `docs/` descrevem arquitetura, regras, testes e auditoria, mas não substituem este guia. Segurança absoluta não existe: mantenha dependências, backups, permissões, logs e integrações sob revisão contínua.
