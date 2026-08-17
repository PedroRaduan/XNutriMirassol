# O que ainda falta fazer para publicar a XNutri

Este é o único tutorial operacional que você precisa seguir daqui para frente. Ele mostra apenas as tarefas que ainda dependem de você, das contas externas ou dos dados reais da loja.

> Não envie por conversa: senhas, CPF, código de verificação, token PagBank, URL do Neon, `AUTH_SECRET`, chave do Cloudinary ou secret do Google.

## 1. O que já está pronto — não faça novamente

- Projeto conectado ao GitHub e à Vercel.
- Preview da Vercel funcionando.
- Banco Neon de Preview separado do banco Production.
- Banco Production com 12/12 migrations aplicadas.
- Prisma Client, migrations, build e cron diário configurados.
- Cloudinary configurado.
- Google OAuth configurado tecnicamente na Vercel e no Google Cloud.
- Carrinho, quantidade, CEP, frete, retirada e validações do checkout conferidos.
- Lint, TypeScript, Prisma e build aprovados.
- 45/45 testes unitários e 35/35 testes E2E aprovados, incluindo permissões e segurança dos dois PWAs.
- PWA privado da Administração preparado para o dono.
- PWA privado do PDV preparado para a funcionária do caixa.

Não recrie o projeto Vercel, o banco Neon, as migrations, o cliente Google, o Cloudinary ou o seed.

## 2. Ordem exata do que você precisa fazer

Siga nesta ordem:

1. Entrar no Portal do Desenvolvedor PagBank.
2. Deixar o Codex configurar e testar o PagBank Sandbox no Preview.
3. Testar o login Google uma vez.
4. Separar os dados verdadeiros da loja e escolher o domínio final.
5. Confirmar a conta do dono e criar uma conta própria para a funcionária no banco correto.
6. Testar os PWAs da Administração e do PDV no Preview.
7. Ativar MFA e backup.
8. Aprovar o Preview.
9. Trocar a credencial Production do Neon imediatamente antes da publicação.
10. Deixar o Codex configurar PagBank Production, domínio e deployment.
11. Cadastrar/revisar os dados reais no Production e fazer uma compra controlada.
12. Instalar novamente os PWAs usando o domínio definitivo.

## 3. Entrar no PagBank

Esta é a primeira pendência. O Codex não deve receber nem digitar sua senha ou seu código 2FA.

1. Abra o Portal do Desenvolvedor PagBank.
2. Entre pessoalmente com CPF/CNPJ, senha e código de verificação.
3. Não copie nenhum desses dados para a conversa.
4. Quando o painel estiver aberto, diga somente: `Entrei no PagBank`.

Depois que você disser `Entrei no PagBank`, o Codex fará a parte técnica no Preview:

1. Obter o token Sandbox.
2. Configurar `PAGBANK_ENVIRONMENT=sandbox` e `PAGBANK_TOKEN` somente no ambiente Preview da Vercel.
3. Usar `PAGBANK_WEBHOOK_TOKEN` somente se o próprio PagBank fornecer uma credencial de autenticidade separada. Não invente um valor: quando ela não existir, o código usa `PAGBANK_TOKEN` para validar a assinatura.
4. Encontrar o endereço atual em Vercel → projeto XNutri → **Deployments** → primeiro deployment **Ready** → **Visit**.
5. Configurar o webhook Sandbox apontando para:

```text
https://SEU-PREVIEW/api/payments/pagbank/webhook
```

6. Fazer uma compra fictícia no Sandbox.
7. Conferir pedido, pagamento, estoque e auditoria.
8. Testar assinatura ausente/inválida e repetição do evento, sem executar ataque contra terceiros.

Resultado esperado: o PagBank muda o pedido corretamente, uma cobrança não cria dois pedidos e um webhook repetido não baixa o estoque novamente.

Não use cartão real no Sandbox.

## 4. Testar o login Google

A configuração técnica já está pronta. Falta apenas um login humano completo.

1. Abra o Preview da Vercel.
2. Clique em **Entrar**.
3. Clique em **Continuar com Google**.
4. Use uma conta de teste que você controla.
5. Confirme que o Google volta para a XNutri com o usuário autenticado.
6. Saia e entre novamente para confirmar.

Se aparecer `OAuthAccountNotLinked`, o mesmo e-mail já possui conta local. Entre por e-mail e senha; não apague o usuário do banco.

Somente depois que o login funcionar:

1. Abra Google Cloud → Google Auth Platform → Clientes → XNutri.
2. Localize as duas chaves secretas ativas.
3. Desative primeiro a chave antiga.
4. Teste o login Google novamente.
5. Se continuar funcionando, exclua a chave antiga.
6. Não exclua a chave nova usada pela Vercel.

## 5. Trocar a credencial Production do Neon

Uma URL real do Neon já foi compartilhada anteriormente. Por segurança, ela precisa ser rotacionada antes da publicação.

Faça esta etapa imediatamente antes do deployment Production. O banco Preview é separado e não valida a senha do banco Production. Como a loja ainda não foi aberta oficialmente, uma breve interrupção do deployment Production antigo não afeta clientes reais.

1. Abra o projeto XNutri no Neon.
2. Abra a área de conexão/roles.
3. Redefina a senha do usuário usado pelo site.
4. Copie novamente a URL com pooler para `DATABASE_URL`.
5. Copie novamente a URL direta para `DIRECT_URL`.
6. Prefira URLs terminando em `sslmode=verify-full` quando o Neon oferecer.
7. Na Vercel, abra o projeto XNutri → **Settings** → **Environment Variables**.
8. Atualize `DATABASE_URL` e `DIRECT_URL` somente no ambiente **Production**.
9. Atualize `.env.local` no computador somente se ele precisar continuar conectado ao Neon Production.
10. Não altere o banco `xnutri_preview`.

Variáveis novas da Vercel só entram na aplicação depois de um novo deployment. Portanto, após a rotação, o Codex fará o deployment Production assim que PagBank, domínio e Preview estiverem aprovados.

Depois do novo deployment, confira no **domínio Production**, não no Preview:

```text
/api/health
```

Resultado esperado:

```json
{"status":"ok","database":"connected","service":"xnutri"}
```

## 6. Separar e cadastrar os dados verdadeiros da loja

Antes de vender, entre no Admin e revise:

- nome da loja;
- endereço verdadeiro;
- WhatsApp;
- e-mail;
- horário de atendimento;
- CNPJ, quando aplicável;
- Instagram e demais redes;
- produtos reais;
- categorias;
- preços de venda;
- preços de custo;
- estoque;
- imagens reais;
- retirada na loja;
- entrega regional;
- métodos de frete ativos;
- cupons que realmente serão usados;
- políticas de privacidade, troca e termos.

Prepare essas informações antes da publicação. Depois do primeiro deployment Production aprovado, entre no Admin Production e cadastre/revise os dados antes de divulgar a loja. Remova ou desative produtos, telefones, endereços, avaliações e imagens fictícias.

## 7. Criar os acessos corretos

O dono e a funcionária devem usar contas diferentes. Nunca compartilhe a conta do dono.

Esses comandos alteram somente o banco apontado por `DIRECT_URL` (prioridade) ou `DATABASE_URL` no `.env.local`. Antes de executá-los, pare e confira qual ambiente está selecionado. Preview e Production são bancos diferentes: uma conta criada em um não aparece automaticamente no outro.

### Dono da loja

O dono precisa ter:

```text
User.role = ADMIN
AdminUser.role = ADMIN
```

Essa conta pode acessar `/admin` e instalar a Administração XNutri. Outros cargos não recebem o manifesto nem o botão do PWA administrativo.

Se ainda for necessário criar ou corrigir o dono no banco escolhido, use uma senha exclusiva no seu próprio PowerShell:

```powershell
npm run admin:create -- "dono@seudominio.com.br" "SUA-SENHA-EXCLUSIVA" "Nome do dono"
```

Não envie essa senha para a conversa. Antes de Production, confirme que existe somente uma conta `AdminUser.role = ADMIN` real. Desative contas administrativas de seed, teste ou de pessoas que não sejam o dono. No sistema atual, `ADMIN` é a função de dono; qualquer segunda conta `ADMIN` ativa também teria acesso total e receberia o PWA administrativo.

### Funcionária do caixa

A funcionária precisa ter:

```text
User.role = ADMIN
AdminUser.role = CASHIER
```

Isso não transforma a funcionária em dona. O primeiro campo identifica que ela faz parte da equipe; `CASHIER` limita a conta ao PDV.

No PowerShell, dentro da pasta do projeto, gere uma senha aleatória:

```powershell
$SENHA_CAIXA = node -e "console.log('Cx!aA1-' + require('crypto').randomBytes(18).toString('base64url'))"
$SENHA_CAIXA
```

Guarde essa senha em um gerenciador de senhas e entregue-a pessoalmente à funcionária. Depois, crie a conta substituindo o e-mail e o nome:

```powershell
npm run cashier:create -- "funcionaria@seudominio.com.br" $SENHA_CAIXA "Nome da funcionária"
```

O comando:

- cria ou atualiza somente uma conta que já seja `CASHIER`;
- recusa converter uma conta de cliente, gerente, visualizador ou dono em caixa;
- valida uma senha forte;
- registra a criação na auditoria;
- não imprime a senha novamente.

Use um e-mail novo e exclusivo da funcionária. Não reaproveite uma conta de cliente, gerente ou dono. Para testar no Preview, crie contas fictícias somente no banco Preview; para operar a loja, repita com as contas reais somente no banco Production.

Antes de executar, confirme que `.env.local` aponta para o banco correto. Nunca rode `prisma migrate reset`, `db push --force-reset` ou seed em Production.

## 8. Instalar os dois aplicativos PWA

Os PWAs são atalhos instaláveis do mesmo site. Eles exigem internet e continuam verificando login e permissão no servidor. Nenhum dado administrativo, venda ou cliente fica disponível offline.

O navegador permite que qualquer pessoa salve um atalho comum para uma página pública ou de login. Isso não concede acesso. A exclusividade real vem do servidor: somente `ADMIN` autenticado recebe o manifesto/botão da Administração, e somente `ADMIN` ou `CASHIER` autenticado entra no PDV.

### PWA Administração — somente o dono

1. Abra o site HTTPS no aparelho do dono.
2. Entre com a conta `ADMIN`.
3. Abra `/admin`.
4. Use **Instalar Administração** quando o botão aparecer.

Alternativas por aparelho:

- Android/Chrome: menu `⋮` → **Instalar app** ou **Adicionar à tela inicial**.
- iPhone/iPad: Safari → **Compartilhar** → **Adicionar à Tela de Início**.
- Windows/macOS: Chrome ou Edge → ícone de instalação na barra de endereço ou menu → **Instalar**.

O botão e o manifesto administrativo são enviados apenas depois da validação `ADMIN`. Instalar o ícone não mantém acesso se o usuário for desativado ou a sessão expirar.

### PWA PDV — funcionária do caixa

1. Abra o site HTTPS no aparelho usado no caixa.
2. Entre com a conta própria da funcionária `CASHIER`.
3. Abra `/pdv`.
4. Use **Instalar PDV** quando o botão aparecer.

Se o botão não aparecer, use o menu do Chrome/Edge ou, no iPhone, Safari → Compartilhar → Adicionar à Tela de Início.

O PWA PDV possui nome, início, escopo, service worker e manifesto diferentes do PWA Admin. A conta `CASHIER` não pode abrir produtos, configurações, financeiro ou demais módulos administrativos.

Importante:

- Instale Admin e PDV em aparelhos diferentes.
- Se precisar usar o mesmo computador, crie perfis separados no Chrome/Edge.
- Dois PWAs no mesmo perfil compartilham a sessão do site; o último login pode substituir o anterior.
- Se a funcionária sair da empresa, desative a conta. O ícone pode continuar instalado, mas o servidor bloqueará o acesso.
- Um PWA instalado no endereço Preview continuará apontando para o Preview. Depois da publicação, desinstale o teste e instale novamente usando o domínio definitivo.

## 9. Ativar MFA e proteger as contas externas

Ative autenticação em dois fatores em:

- GitHub;
- Vercel;
- Neon;
- Google Cloud;
- Cloudinary;
- PagBank.

Use senhas diferentes para dono e funcionária. Guarde códigos de recuperação fora do computador usado diariamente.

Isto protege as contas dos provedores, mas não adiciona MFA dentro do login `/admin`. O painel já possui senha forte, sessão segura, rate limit e autorização no servidor; MFA próprio do Admin continua sendo um reforço futuro a decidir antes de aumentar a equipe.

## 10. Ativar backup e testar restauração

1. No Neon, ative backup/PITR disponível no plano escolhido.
2. Crie uma branch de teste a partir do backup.
3. Confira nessa branch produtos, usuários, pedidos e migrations.
4. Nunca teste restauração por cima de Production.
5. Exclua a branch de teste depois da conferência.
6. Anote a data do último teste de restauração.

A branch temporária criada antes das migrations não substitui o backup automático.

Se o seu plano não oferecer PITR, faça uma exportação/backup seguro, guarde-a fora do repositório e teste a restauração em outro banco vazio. Nunca use o banco Production como teste de restauração.

## 11. Aprovar o Preview

Antes de publicar, confira com dados fictícios:

- [ ] login do dono por e-mail e senha;
- [ ] login Google;
- [ ] Admin abre somente para o dono;
- [ ] PWA Administração aparece somente para `ADMIN`;
- [ ] funcionária `CASHIER` abre o PDV;
- [ ] PWA PDV aparece para a funcionária;
- [ ] funcionária não abre `/admin`;
- [ ] abrir e fechar caixa;
- [ ] venda em dinheiro, PIX, cartão e pagamento misto;
- [ ] produto e estoque;
- [ ] upload de imagem;
- [ ] carrinho e mudança de quantidade;
- [ ] CEP, frete e retirada;
- [ ] PagBank Sandbox;
- [ ] webhook repetido não duplica pedido/estoque;
- [ ] celular e computador sem rolagem lateral;
- [ ] `/api/health` com banco conectado;
- [ ] logs da Vercel sem erro relevante.

Não aprove o Preview se PagBank ainda estiver sem token.

## 12. Publicar em Production

Siga esta ordem:

1. Defina o domínio final HTTPS.
2. Configure o domínio na Vercel.
3. Deixe `NEXT_PUBLIC_APP_URL`, `AUTH_URL` e `NEXTAUTH_URL` iguais ao domínio final.
4. Cadastre no Google o callback do domínio final:

```text
https://SEU-DOMINIO/api/auth/callback/google
```

5. Obtenha o token PagBank Production.
6. Configure `PAGBANK_ENVIRONMENT=production` e `PAGBANK_TOKEN` em Production.
7. Cadastre o webhook PagBank do domínio final.
8. Confirme que as novas URLs do Neon estão em Production.
9. Faça merge da branch aprovada para `main` ou promova o deployment aprovado.
10. Abra `/api/health`.
11. Faça uma compra real controlada de valor baixo.
12. Confira pagamento, pedido, estoque, auditoria e webhook.
13. Teste `/admin` e `/pdv`.
14. Instale novamente Administração e PDV usando o domínio final.
15. Monitore os logs da Vercel e PagBank nas primeiras horas.

Se o deployment Production falhar, pare os testes de venda e use **Vercel → Deployments → deployment anterior → Promote/Rollback**. Isso reverte o código, mas não desfaz migrations do banco. Nunca rode `prisma migrate reset`, `db push --force-reset` ou restaure um backup por cima de Production para tentar corrigir sozinho; informe o erro ao Codex.

## 13. Se algo der errado

### PagBank não atualiza o pedido

- confira se o token pertence ao ambiente correto;
- confira a URL pública do webhook;
- confira o cabeçalho de autenticidade;
- veja logs da Vercel;
- não marque o pedido como pago manualmente sem confirmar no PagBank.

### Login Google falha

- confira se o callback é exatamente o domínio aberto;
- confira `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no ambiente correto;
- faça Redeploy depois de alterar variáveis;
- para `OAuthAccountNotLinked`, entre por senha com a conta local existente.

### Banco falha depois da rotação

- confira se `DATABASE_URL` é a URL pooler;
- confira se `DIRECT_URL` é a URL direta;
- confira senha, host e `sslmode=verify-full`;
- faça Redeploy;
- abra `/api/health`.

### O botão do PWA não aparece

- use HTTPS ou `localhost`;
- entre com o cargo correto;
- abra `/admin` para o dono ou `/pdv` para a funcionária;
- no iPhone, use obrigatoriamente Safari → Compartilhar → Adicionar à Tela de Início;
- no Chrome/Edge, procure **Instalar app** no menu;
- desinstale uma instalação antiga do mesmo endereço antes de testar novamente.

### O PWA abre a área errada

- desinstale o ícone;
- apague os dados do site daquele domínio;
- entre novamente na rota correta;
- instale Administração a partir de `/admin` e PDV a partir de `/pdv`.

### Funcionária consegue acessar Admin

Não continue vendendo. Confirme que a conta possui `AdminUser.role = CASHIER`, desative a conta incorreta e revise os logs de auditoria.

### Deploy Production fica bloqueado

Confira primeiro `PAGBANK_TOKEN`, `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` e `CRON_SECRET`. O bloqueio é intencional quando uma configuração crítica de Production está ausente.

## 14. Checklist final

- [ ] PagBank Sandbox aprovado.
- [ ] Login Google real aprovado e secret antigo removido.
- [ ] Credencial Neon rotacionada.
- [ ] Dados reais da loja revisados.
- [ ] Conta do dono exclusiva.
- [ ] Conta `CASHIER` própria para a funcionária.
- [ ] PWA Administração testado com o dono.
- [ ] PWA PDV testado com a funcionária.
- [ ] MFA ativado em todas as contas externas.
- [ ] Backup automático ativo e restauração testada.
- [ ] Preview totalmente aprovado.
- [ ] PagBank Production configurado.
- [ ] Domínio final configurado.
- [ ] Production com `/api/health` conectado.
- [ ] Compra real controlada aprovada.
- [ ] PWAs reinstalados no domínio definitivo.

Quando terminar uma etapa externa, informe apenas o resultado, nunca a credencial. Exemplo: `Entrei no PagBank` ou `O login Google funcionou`.
