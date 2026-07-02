# Segurança da XNutri

Este guia descreve as proteções implementadas, as configurações externas obrigatórias e os testes antes de abrir a loja ao público.

## O que foi reforçado

- Sessão Auth.js com duração configurável, cookies seguros em produção e proteção de origem nas mutações.
- Limite de tentativas no login aplicado dentro do provedor de credenciais, além dos formulários.
- Controle de acesso validado no servidor: `ADMIN` tem acesso total, `MANAGER` acessa dashboard, produtos, estoque, pedidos e relatórios, `CASHIER` acessa apenas o PDV e `CUSTOMER` apenas a área do cliente.
- Checkout recalcula no servidor preço, desconto, frete e total. Produto inativo, variação inativa, cupom vencido, frete desativado e retirada desativada são recusados.
- Mercado Pago valida assinatura do webhook e confere referência, valor e moeda antes de aprovar o pedido.
- Upload restrito ao administrador de conteúdo, com limite de 4 MB, MIME permitido e assinatura real de JPG, PNG, WebP ou AVIF.
- Rate limit em login, cadastro, recuperação, checkout, frete, CEP, upload, preferência, webhook e buscas do PDV.
- Headers CSP, anti-frame, `nosniff`, política de referência, permissões e HSTS em produção.
- Auditoria de login administrativo, acesso negado, produtos, estoque, cupons, pedidos, configurações, PDV, upload e webhook.
- Erros técnicos são ocultados do cliente nos fluxos públicos críticos.
- Dependências transitivas vulneráveis foram substituídas por versões corrigidas por `overrides` no `package.json`.

## Variáveis de ambiente

Copie o modelo e nunca envie o arquivo real ao Git:

```powershell
Copy-Item .env.example .env.local
```

Gere o segredo de autenticação:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Preencha em `.env.local` no computador e no painel da hospedagem em produção:

```env
DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"
DIRECT_URL="postgresql://.../neondb?sslmode=require"
AUTH_SECRET="COLE_A_CHAVE_GERADA"
AUTH_URL="https://seu-dominio.com.br"
NEXTAUTH_URL="https://seu-dominio.com.br"
NEXT_PUBLIC_APP_URL="https://seu-dominio.com.br"
AUTH_TRUST_HOST="true"
AUTH_SESSION_MAX_AGE_SECONDS="28800"

MERCADO_PAGO_ENVIRONMENT="sandbox"
MERCADO_PAGO_ACCESS_TOKEN=""
MERCADO_PAGO_PUBLIC_KEY=""
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=""
MERCADO_PAGO_WEBHOOK_SECRET=""

CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
CLOUDINARY_FOLDER="xnutri"

PDV_CASHIER_MAX_DISCOUNT_PERCENT="10"
```

Depois de alterar variáveis na Vercel, abra `Deployments`, selecione o último deploy e use `Redeploy`. Variáveis antigas não são aplicadas automaticamente a um deploy que já terminou.

## Banco de dados seguro

1. Use PostgreSQL gerenciado com TLS; para Neon, mantenha `sslmode=require`.
2. Use a URL com pooler em `DATABASE_URL` e a URL direta em `DIRECT_URL`.
3. Restrinja o painel do provedor com MFA e não compartilhe a senha do banco.
4. Nunca use `localhost`, o container Docker ou credenciais reais no código publicado.
5. Faça backup antes de migrations importantes.
6. Se uma URL com senha foi enviada em chat, captura de tela ou repositório, redefina a senha no provedor e atualize todas as variáveis.

Aplicar migrations sem apagar dados:

```powershell
npm run db:generate
npm run db:deploy
npm run db:status
```

Criar o primeiro administrador:

```powershell
npm run admin:create -- admin@xnutri.com.br "UmaSenhaForte#2026"
```

## Mercado Pago seguro

1. Crie uma aplicação em **Suas integrações** no Mercado Pago.
2. Comece com credenciais de teste e `MERCADO_PAGO_ENVIRONMENT=sandbox`.
3. Cadastre o webhook público:

```text
https://seu-dominio.com.br/api/payments/mercado-pago/webhook
```

4. Selecione eventos de pagamento e copie a assinatura secreta para `MERCADO_PAGO_WEBHOOK_SECRET`.
5. Só use `production` com o Access Token de produção e HTTPS ativo.
6. Nunca aceite valor, preço ou status enviados pelo navegador; o projeto consulta o pagamento na API e compara valor, moeda e pedido.

Teste primeiro com pedido pequeno em sandbox. Confirme em `/admin/auditoria` o evento `payment.webhook.processed` e verifique se o estoque baixou uma única vez.

## Cloudinary seguro

1. Crie a conta e copie Cloud name, API key e API secret.
2. Coloque o segredo somente no servidor; nunca crie variável `NEXT_PUBLIC_` para o API secret.
3. Configure as três variáveis na hospedagem e faça novo deploy.
4. Entre como `ADMIN`, abra **Admin > Banners** e envie uma imagem válida de até 4 MB.
5. Confirme o evento `image.upload` em **Admin > Auditoria**.

O endpoint recusa extensões executáveis renomeadas como imagem. Para exclusão automática ou moderação avançada, configure regras adicionais na conta Cloudinary.

## Testar autenticação e permissões

Crie contas separadas para cada função e teste em janela anônima:

- `CUSTOMER`: `/admin` e `/pdv` devem redirecionar para login ou acesso negado.
- `CASHIER`: deve abrir `/pdv`, mas não `/admin/produtos`.
- `MANAGER`: deve abrir dashboard, produtos, estoque, pedidos e relatórios; não deve abrir categorias, PDV, clientes, finanças, conteúdo, entregas, configurações ou auditoria.
- `ADMIN`: deve acessar todos os módulos.
- Um usuário administrativo inativo deve perder o acesso na próxima validação de rota.

Teste oito senhas erradas seguidas e confirme o bloqueio temporário. Não use esse teste com a senha real de produção.

## Testar checkout seguro

1. Adicione um produto ativo e calcule o frete.
2. Altere a quantidade e confirme que o frete precisa ser selecionado novamente.
3. Tente finalizar sem CEP, frete, retirada, pagamento ou consentimento; a tela deve listar o campo e levar o foco até ele.
4. Desative o frete no admin depois de selecioná-lo; o checkout deve recusar a opção antiga.
5. Desative o produto ou reduza o estoque; a criação do pedido deve ser recusada.
6. Altere preço, desconto, subtotal ou frete no DevTools; o valor final deve continuar sendo recalculado pelo servidor.
7. Simule um webhook com assinatura inválida; a resposta deve ser `401` e o pedido não pode ser aprovado.
8. Confirme que pagamento aprovado com valor ou moeda diferente não altera o status do pedido.

## Testar o PDV

1. Entre com `CASHIER` e abra o caixa.
2. Tente vender sem sessão aberta: a ação deve falhar.
3. Tente quantidade acima do estoque: a ação deve falhar quando estoque negativo estiver desativado.
4. Tente desconto acima de `PDV_CASHIER_MAX_DISCOUNT_PERCENT`: o caixa deve bloquear.
5. Faça pagamento misto e confira se a soma precisa bater exatamente com o total.
6. Cancele e devolva itens; confira estoque e eventos na auditoria.
7. Confirme que `MANAGER` e `CUSTOMER` não acessam o PDV.

## Logs e privacidade

Use **Admin > Auditoria** para conferir usuário, ação, entidade, data, IP e alterações relevantes. Não grave senha, token, número de cartão ou connection string nos logs.

A política pública está em `/privacidade`. Solicitações de correção ou exclusão de dados devem ser tratadas pelos canais oficiais e respeitar obrigações fiscais e legais de retenção.

## Rate limit em produção

O limitador atual é simples, em memória e suficiente para uma única instância pequena. Em Vercel com várias instâncias, cada instância mantém seu próprio contador. Antes de campanhas com alto tráfego, substitua o armazenamento por Redis gerenciado (por exemplo, Upstash) mantendo as mesmas chaves e janelas.

## Deploy seguro

Execute antes de publicar:

```powershell
npm install
npm audit
npm run db:validate
npm run production:check
npm run lint
npm run typecheck
npm run build
```

Na Vercel, mantenha:

```text
Install Command: npm install
Build Command: npm run vercel-build
```

Use somente HTTPS, configure o domínio real em `NEXT_PUBLIC_APP_URL`, `AUTH_URL` e `NEXTAUTH_URL`, e faça o primeiro teste com Mercado Pago em sandbox.

## Erros comuns

- `MissingSecret`: configure `AUTH_SECRET` com pelo menos 32 caracteres aleatórios e redeploy.
- `P1001`: confira host, senha, TLS, projeto ativo e allowlist do PostgreSQL.
- `P2021`: rode `npm run db:deploy` no banco correto.
- `401` no webhook: copie novamente a assinatura secreta do mesmo ambiente da credencial usada.
- Upload `503`: as três variáveis Cloudinary não estão disponíveis no deploy.
- CSP bloqueando recurso: confira o console e adicione somente o domínio indispensável em `next.config.ts`; não use curingas globais.
- Muitos pedidos `429`: aguarde a janela ou revise os limites; não desative a proteção em produção.

## Checklist final

- [ ] `AUTH_SECRET` forte e exclusivo configurado.
- [ ] `DATABASE_URL` não exposta e senha do banco rotacionada quando necessário.
- [ ] PostgreSQL online com TLS e migrations aplicadas.
- [ ] Admin e PDV protegidos no frontend e no servidor.
- [ ] Perfis `ADMIN`, `MANAGER`, `CASHIER` e `CUSTOMER` testados.
- [ ] Checkout recalculando preço, cupom, frete e total no servidor.
- [ ] Webhook com assinatura, valor, moeda e referência validados.
- [ ] Upload aceitando somente imagens válidas e auditado.
- [ ] Rate limits ativos.
- [ ] Headers de segurança conferidos no domínio HTTPS.
- [ ] Logs de auditoria funcionando sem segredos.
- [ ] Política de privacidade e canal de atendimento revisados.
- [ ] `npm audit` sem vulnerabilidades conhecidas.
- [ ] `lint`, `typecheck` e `build` concluídos.
- [ ] Backup e procedimento de recuperação documentados.
