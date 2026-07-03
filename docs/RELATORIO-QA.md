# Relatório de QA da XNutri

Data da execução: 2 e 3 de julho de 2026.

## Resultado executivo

O projeto foi testado com banco PostgreSQL local isolado (`xnutri_test`). Nenhum teste alterou o banco Neon de produção.

- 27 testes unitários e de componentes: aprovados.
- 25 testes E2E Playwright: aprovados.
- 9 cenários responsivos dentro da suíte E2E: aprovados em desktop, 360 px, celular e tablet.
- ESLint: aprovado sem avisos.
- TypeScript: aprovado.
- Prisma validate e 6 migrations: aprovados.
- Build de produção Next.js: aprovado.
- `npm audit --audit-level=high`: 0 vulnerabilidades.
- Smoke test com `npm start`: aprovado.
- `/api/health`: HTTP 200, banco conectado.

## Ambiente seguro de teste

O script `npm run test:db:reset`:

1. exige um nome de banco contendo `test`;
2. cria `xnutri_test`, se necessário;
3. aplica as migrations;
4. executa o seed protegido;
5. nunca usa a `DATABASE_URL` de produção.

Contas do banco de teste:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| ADMIN | `admin@xnutri.com.br` | `Admin@12345` |
| MANAGER | `gerente@xnutri.com.br` | `Gerente@12345` |
| CASHIER | `caixa@xnutri.com.br` | `Caixa@12345` |
| CLIENT | `cliente@xnutri.com.br` | `Cliente@12345` |

Essas contas são apenas para ambiente local/teste. Troque todas as credenciais reais antes da produção.

## Plano executado

### Loja pública

- Home, catálogo, busca e filtros.
- Página de produto, variação, quantidade, estoque e produto indisponível.
- Carrinho vazio, adição, remoção, duplicidade, alteração de quantidade e persistência.
- Cupom válido e inválido; regras de cupom também têm testes unitários para expiração e limites.
- CEP inválido e CEP real de Mirassol.
- Frete manual, retirada com frete zero e persistência da escolha.
- Checkout como visitante, validação, Enter no CEP/formulário, resumo de erros e foco no campo.
- Dois cliques simultâneos em finalizar, com confirmação de apenas um pedido no banco.
- Página de confirmação e fotografia financeira do pedido.

### Autenticação e permissões

- Usuário deslogado em `/admin` e `/pdv`.
- CLIENT bloqueado no admin e PDV.
- CASHIER permitido no PDV e bloqueado em produtos.
- MANAGER permitido em produtos/estoque/pedidos/relatórios e bloqueado no financeiro.
- ADMIN com acesso total.
- Rotas backend do PDV e upload bloqueadas sem sessão.

### Admin

- Dashboard e módulos principais.
- Criação e edição de produto.
- Fechamento automático do painel de edição após salvar.
- Estoque e preço persistidos no PostgreSQL.
- SKU duplicado rejeitado sem expor Prisma ou stack trace.
- Cupom sem restrição opcional de produto/categoria.
- Auditoria criada para alterações importantes.

### PDV

- Login do caixa e abertura de sessão.
- Busca exata por SKU.
- Adição, quantidade limitada ao estoque e desconto limitado ao total.
- Pagamento misto e bloqueio de cliques repetidos.
- Finalização, comprovante, estoque e registro da venda.
- Cálculos financeiros cobertos por testes unitários.

### Responsividade e acessibilidade

- Home, catálogo, produto, carrinho, checkout, login, admin e PDV.
- Desktop, 360 px, celular e tablet.
- Nenhuma página testada criou rolagem horizontal no documento.
- Logo inteira abaixo de 380 px, menu e carrinho visíveis.
- Labels de variação/quantidade e controles do PDV acessíveis.

## Bugs encontrados e corrigidos

### QA-001 — Seed podia apagar o banco errado

- Gravidade: crítica.
- Onde: `prisma/seed.ts`.
- Reprodução: executar o seed com uma URL apontando para um banco real.
- Resultado anterior: o seed limpava tabelas antes de popular os dados.
- Resultado esperado: uma operação destrutiva precisa recusar produção.
- Causa: ausência de trava por ambiente/nome do banco.
- Correção: seed permitido somente em banco com `test` ou com confirmação explícita `ALLOW_DESTRUCTIVE_SEED=true`.

### QA-002 — Checkout podia receber cliques simultâneos

- Gravidade: crítica.
- Onde: checkout e criação do pedido.
- Reprodução: clicar rapidamente duas vezes em “Finalizar pedido”.
- Resultado anterior: duas ações podiam iniciar antes do estado visual de loading.
- Resultado esperado: apenas um pedido por carrinho.
- Causa: proteção apenas pelo estado renderizado.
- Correção: trava síncrona no cliente e `SELECT ... FOR UPDATE` parametrizado no carrinho dentro da transação PostgreSQL.
- Arquivos: `src/components/checkout/checkout-form.tsx` e `src/lib/ecommerce/orders.ts`.

### QA-003 — Baixa/estorno de estoque online não era totalmente idempotente

- Gravidade: crítica.
- Onde: webhook Mercado Pago e estoque.
- Resultado anterior: concorrência podia causar baixa repetida ou estoque inconsistente; cancelamento/reembolso online não restaurava em todos os fluxos.
- Correção: baixa atômica, movimento único por pedido/tipo e estorno idempotente.
- Arquivos: `src/lib/ecommerce/inventory.ts`, `src/lib/payments/mercado-pago.ts`, `src/lib/actions/admin.ts`, schema e migration de idempotência.

### QA-004 — PDV usava saldo antigo em venda concorrente

- Gravidade: alta.
- Onde: finalização do PDV.
- Resultado anterior: duas vendas concorrentes podiam sobrescrever o saldo uma da outra.
- Correção: decremento atômico condicionado ao saldo disponível.
- Arquivo: `src/lib/actions/pos.ts`.

### QA-005 — Caixa em loop ao tentar abrir área do admin

- Gravidade: alta.
- Reprodução: entrar como CASHIER e abrir `/admin/produtos`.
- Resultado anterior: redirecionamento infinito entre admin e login.
- Resultado esperado: mensagem de acesso negado sem quebrar a navegação.
- Correção: o login administrativo não redireciona automaticamente uma sessão autenticada quando recebeu `error=unauthorized`.
- Arquivo: `src/app/admin/login/page.tsx`.

### QA-006 — Modo demo escondia banco offline

- Gravidade: alta.
- Resultado anterior: em desenvolvimento, uma falha real do PostgreSQL podia abrir silenciosamente o modo treinamento mesmo com `ALLOW_DEMO_DATA=false`.
- Correção: todas as entradas no modo demo respeitam `isDemoModeAllowed()`.
- Arquivos: ações de autenticação e páginas de login do admin/PDV.

### QA-007 — Cupom opcional falhava com `null`

- Gravidade: média.
- Reprodução: criar cupom sem selecionar produtos ou categorias.
- Resultado anterior: “Invalid input: expected string, received null”.
- Correção: campos opcionais vazios são convertidos para `undefined` antes do Zod.
- Arquivo: `src/lib/actions/admin.ts`.

### QA-008 — CEP e imagem inválidos no seed

- Gravidade: média.
- Resultado anterior: `15130-000` não existe no ViaCEP e uma URL Unsplash retornava 404.
- Correção: CEPs consistentes com as ruas do seed e substituição da imagem quebrada.
- Arquivos: seed, fallbacks e JSON-LD.

### QA-009 — Acessibilidade incompleta em produto e PDV

- Gravidade: média.
- Resultado anterior: seletor de opção e quantidade do produto não tinham associação completa; quantidade e remoção no PDV não tinham nome acessível.
- Correção: `htmlFor`, `id` e `aria-label` descritivos.

### QA-010 — Lint analisava relatórios gerados

- Gravidade: baixa.
- Resultado anterior: ESLint entrava no JavaScript minificado do Playwright e gerava milhares de avisos.
- Correção: ignorar `playwright-report`, `test-results` e `coverage`.
- Arquivo: `eslint.config.mjs`.

### QA-011 — Avisos de imagem e LCP

- Gravidade: baixa.
- Correção: imagens acima da dobra usam prioridade de carregamento compatível com Next.js 16; miniaturas do PDV usam `fill` e `sizes` sem distorção.

### QA-012 — Cache de desenvolvimento colidia com o build

- Gravidade: média para a automação.
- Resultado anterior: rodar E2E depois de `next build` podia gerar 404 e “Failed to find Server Action”.
- Causa: `next dev` e `next build` compartilhavam a pasta `.next`.
- Correção: Playwright usa `NEXT_DIST_DIR=.next-e2e`; as APIs privadas de PDV/upload também passaram a responder JSON `401/403` diretamente.

### QA-013 — Cliques rápidos na quantidade do carrinho eram perdidos

- Gravidade: alta para a experiência de compra.
- Onde: controle de quantidade do carrinho.
- Resultado anterior: cada formulário enviava a quantidade antiga renderizada; cliques rápidos podiam repetir o mesmo valor e não havia feedback de atualização ou erro.
- Resultado esperado: o número muda imediatamente, a última quantidade é salva e permanece após recarregar.
- Correção: controle otimista com fila sequencial, limite de estoque, estado de carregamento, restauração em erro e mensagem acessível.
- Arquivos: `src/components/cart/cart-quantity-control.tsx`, `src/components/cart/cart-line.tsx` e `src/lib/actions/cart.ts`.

## Pontos externos que ainda precisam de teste real

Não foram enviados pagamentos nem uploads para serviços reais, pois as credenciais não estavam configuradas no ambiente isolado.

- Mercado Pago: testar uma compra sandbox e validar assinatura/webhook público.
- Cloudinary: testar JPG/PNG/WebP/AVIF real, remoção e credenciais de produção.
- Correios: testar contrato/token reais; o frete manual e o CEP foram aprovados.
- E-mail: não há provedor de envio completo configurado para confirmação/recuperação.
- Neon: migrations e conexão devem ser verificadas no deploy, sem usar o seed destrutivo.

Risco operacional conhecido: pedidos online pendentes validam o estoque e a aprovação usa baixa atômica, mas ainda não existe expiração automática de reserva para carrinhos/pedidos abandonados. Para vendas concorrentes de última unidade em alto volume, implemente reserva temporária com expiração antes de ampliar tráfego.

O V8 mostra 11,51% de cobertura de linhas unitárias porque Server Actions e páginas são exercitadas principalmente pelos testes E2E. Não use esse número sozinho como medida de cobertura funcional.

## Como rodar

```powershell
cd C:\Users\Sharif\Downloads\xnutri
docker desktop start
docker compose up -d postgres
npm install
npm run test:db:reset
npm test
npm run test:coverage
npm run test:e2e
npm run lint
npm run typecheck
npm run db:validate
npm run build
```

Relatório visual do Playwright:

```powershell
npm run test:e2e:report
```

Executar somente um grupo:

```powershell
npx playwright test tests/e2e/public-store.spec.ts
npx playwright test tests/e2e/admin.spec.ts
npx playwright test tests/e2e/pdv.spec.ts
npx playwright test tests/e2e/auth-permissions.spec.ts
npx playwright test tests/e2e/responsive.spec.ts
```

## Checklist manual da loja

- [ ] Home e catálogo exibem produtos reais.
- [ ] Busca, filtros e ordenação retornam resultados coerentes.
- [ ] Produto indisponível não pode ser comprado.
- [ ] Carrinho persiste após atualizar a página.
- [ ] Cupom válido/expirado/inválido mostra mensagem clara.
- [ ] CEP real retorna endereço e fretes.
- [ ] Retirada mantém frete em R$ 0,00.
- [ ] Checkout aponta cada campo inválido sem apagar dados.
- [ ] Um duplo clique cria apenas um pedido.
- [ ] Pedido aparece na área do cliente e no admin.

## Checklist manual do admin

- [ ] ADMIN acessa todos os módulos.
- [ ] MANAGER não acessa financeiro/configurações críticas.
- [ ] CASHIER não edita produtos.
- [ ] Produto, variação, imagem, preço, custo e estoque persistem.
- [ ] SKU duplicado é rejeitado com mensagem amigável.
- [ ] Cupom, categoria, banner, frete e retirada salvam corretamente.
- [ ] Status de pedido atualiza estoque de forma idempotente.
- [ ] Auditoria registra usuário, ação, entidade e data.

## Checklist manual do PDV

- [ ] Caixa abre e fecha com valores corretos.
- [ ] Busca funciona por nome, SKU, EAN e código de barras.
- [ ] Quantidade nunca passa do estoque.
- [ ] Dinheiro calcula troco.
- [ ] Pix, débito, crédito e pagamento misto fecham o total.
- [ ] Cliques repetidos não duplicam a venda.
- [ ] Cancelamento/devolução restaura estoque e gera auditoria.
- [ ] Comprovante abre e venda aparece nos relatórios.

## Checklist de produção

- [ ] `DATABASE_URL` pooler e `DIRECT_URL` direta configuradas.
- [ ] `AUTH_SECRET` forte e URLs públicas corretas.
- [ ] Migrations aplicadas com `npm run db:deploy`.
- [ ] Admin real criado; credenciais de seed não usadas.
- [ ] Mercado Pago sandbox aprovado e webhook validado.
- [ ] Cloudinary real aprovado.
- [ ] Frete/Correios e endereço real da loja revisados.
- [ ] HTTPS, headers de segurança e domínio conferidos.
- [ ] `npm run lint`, `typecheck`, `test`, `test:e2e` e `build` aprovados.
- [ ] Logs do primeiro deploy sem `localhost`, P1001, P2021 ou MissingSecret.
