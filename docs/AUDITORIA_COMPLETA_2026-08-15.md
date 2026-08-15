# Auditoria completa XNutri — 15/08/2026

## 1. Resumo executivo

Escopo: loja pública, área do cliente, `/admin`, `/pdv`, APIs, Server Actions, Auth.js, Prisma/PostgreSQL, PagBank, Cloudinary, Vercel, UI, responsividade, acessibilidade, SEO, dependências e documentação.

Regra usada: segurança → integridade dos dados → funcionalidade → UX → performance → estética. Todos os testes com escrita usaram o PostgreSQL local isolado `xnutri_test`; nenhuma compra, exclusão ou ataque foi executado contra produção ou terceiros.

**Risco inicial observado: alto. Risco residual após as correções: médio.** Não há alegação de segurança absoluta. Os principais riscos técnicos corrigidos foram repetição de venda no PDV, cotas de cupom presas/abusáveis, regressão ou aprovação incompleta de webhook, transições arbitrárias de pedido, estoque editado abaixo da reserva, timing de login, retomada de pagamento autenticado e ausência de constraints financeiras. O risco residual decorre principalmente de controles externos ainda não validados: Preview Vercel, PagBank Sandbox, Cloudinary real, backup/restore, MFA do dono e rate limit distribuído.

## 2. Arquitetura encontrada

- Next.js 16 App Router, React 19 e TypeScript estrito.
- Auth.js com credenciais e Google opcional; sessão em cookie seguro em produção.
- Prisma 7 + PostgreSQL; Docker somente local e Neon previsto para Preview/Production.
- Server Components, Server Actions e Route Handlers no mesmo projeto Vercel.
- Loja: catálogo → carrinho persistido → checkout → reserva transacional → PagBank → webhook → baixa idempotente → pedido.
- Admin: autenticação → RBAC → produtos/estoque/cupons/pedidos/clientes/financeiro/auditoria.
- PDV: sessão de caixa → itens → pagamentos → venda idempotente → estoque/movimentação/comprovante.
- Cloudinary para persistência de imagens; ViaCEP/BrasilAPI para endereço; fretes comerciais cadastrados no admin.

### Perfis e permissões

| Perfil | Acesso confirmado no código/teste |
| --- | --- |
| `ADMIN` | Todos os módulos, PDV, financeiro, auditoria e instalação da PWA administrativa |
| `MANAGER` | Produtos, estoque, pedidos e relatórios; financeiro crítico bloqueado |
| `CASHIER` | PDV; admin de produtos/financeiro bloqueado |
| `VIEWER` | Leitura limitada conforme mapa de permissões |
| `CUSTOMER` | Conta e pedidos próprios |
| Visitante | Loja e pedido próprio somente por token opaco |

O proxy faz bloqueio inicial, mas layouts, APIs e Server Actions repetem autorização no servidor. O endereço `/admin` não é tratado como segredo.

### APIs classificadas

| Rotas | Classe | Controle principal |
| --- | --- | --- |
| `/api/health`, `/api/cep/*`, `/api/shipping/quote` | Pública | Resposta mínima, validação e rate limit |
| `/api/auth/*` | Auth.js | Sessão/cookies e providers configurados |
| `/api/pdv/products`, `/api/pdv/customers` | Funcionário | Sessão ativa + permissão de PDV |
| `/api/admin/uploads/cloudinary` | Administrativa | Permissão no servidor, origem, MIME/magic bytes e 4 MB |
| `/api/payments/pagbank/checkout` | Dono/visitante | Proprietário autenticado ou token opaco, origem e rate limit |
| `/api/payments/pagbank/webhook` | Webhook | Corpo bruto, assinatura, referência, cobrança, valor, moeda e idempotência |
| `/api/cron/release-expired-orders` | Interna | `CRON_SECRET`, cancelamento/liberação idempotentes |
| `/api/payments/mercado-pago/*` | Obsoleta | Retorna `410`, sem criar novos pagamentos |

## 3. Vulnerabilidades e bugs

| Severidade | Local | Problema/risco | Correção e evidência | Status |
| --- | --- | --- | --- | --- |
| Alta | PDV | Clique/requisição repetida podia duplicar venda | UUID estável no cliente, coluna única no banco e retorno da venda existente; E2E confirma uma venda | Corrigido/testado |
| Alta | Cupons/pedidos | Pedido não pago consumia limite para sempre; concorrência por cliente | `perCustomerLimit`, advisory lock, liberação marcada uma vez em expiração/cancelamento/reembolso | Corrigido/testado |
| Alta | PagBank webhook | Evento atrasado podia regredir estado; aprovação sem cobrança explícita era permissiva | Máquina de precedência; aprovação exige cobrança `CHAR_`, valor e BRL; repetição não baixa estoque | Corrigido/testado localmente |
| Alta | Pedido/admin | Status podia pular etapas e pagamento manual carecia de barreira forte | Allowlist de transições; somente `ADMIN`; observação mínima e auditoria de override | Corrigido/testado por unidade |
| Alta | Estoque/admin | Edição podia deixar quantidade abaixo de unidades reservadas | Validação em produto, variação e ajuste de estoque; disponibilidade usa `quantity - reserved` | Corrigido/analisado |
| Alta | Banco | Regras monetárias dependiam somente da aplicação | Migration não destrutiva com checks para totais, itens, pagamentos, cupons, carrinho e PDV | Corrigido/aplicado em bancos locais |
| Alta | PagBank retry | Cliente autenticado não retomava pagamento sem token de visitante; retorno tinha dois `?` | Autorização por propriedade e construção via `URL/searchParams` | Corrigido/testado E2E |
| Média | Login/cadastro | Diferença de tempo podia ajudar enumeração; conflito de cadastro tinha caminho distinto | Comparação bcrypt fictícia e resposta genérica; hash antes da tentativa de criação | Corrigido/analisado |
| Média | Checkout | Formatação automática do CEP cancelava a própria cotação e deixava loading infinito | Dependência estável pelo CEP numérico, chave inclui subtotal e controle de abort | Corrigido/testado componente + E2E |
| Média | Admin local | Cookie demo antigo tentava apagar cookie durante render e derrubava `/admin` | Cookie inválido passou a ser ignorado sem mutação em Server Component | Corrigido/testado manualmente |
| Média | Produção | Validador aceitava alguns placeholders como se fossem reais | Bloqueio adicional para banco, domínio e PagBank fictícios | Corrigido/testado por comando sintético |
| Média | Dependências | `nanoid` transitivo vulnerável | Atualização para 5.1.16; `npm audit` zerado | Corrigido/testado |
| Baixa | Imagens | URL externa quebrada deixava card visualmente quebrado | Allowlist HTTPS e fallback acessível no erro | Corrigido/testado componente e navegador |
| Baixa | Mobile | Cards muito estreitos e WhatsApp podiam disputar espaço abaixo de 380 px | Uma coluna no menor breakpoint e botão flutuante oculto nessa faixa | Corrigido/testado E2E/navegador |
| Baixa | Acessibilidade | Busca visível sem nome acessível | `aria-label` nas buscas; verificação de inputs visíveis sem label passou | Corrigido/testado manualmente |
| Baixa | SEO/privacidade | Áreas privadas tinham proteção de indexação incompleta e título duplicado | `robots`, `noindex` por layout/página e título de produto normalizado | Corrigido/analisado |
| Baixa | Erros | Tela pública mencionava banco/integrações e fazia promessa não comprovável | Mensagem amigável com código de suporte, sem infraestrutura/stack | Corrigido/analisado |
| Baixa | PostgreSQL/TLS | Build alertou sobre mudança futura da semântica de `sslmode=require` no `pg` 9 | Guia prefere `verify-full`; validador aceita ambos e alerta sobre migração futura | Corrigido/testado por configuração sintética |

### Controles que já estavam adequados e foram confirmados

- Preço, desconto, cupom, frete, custo, total e estoque são recalculados no servidor.
- Reserva usa atualização atômica; falha por insuficiência reverte a transação.
- Pedido de visitante guarda somente hash SHA-256 de token aleatório; comparação é timing-safe.
- Senhas usam bcrypt; nenhuma senha em texto puro é persistida.
- Upload não aceita SVG/executável, valida assinatura real, tamanho e autorização.
- Entradas persistidas são filtradas e React escapa texto; JSON-LD é serializado contra fechamento de script.
- Não foi encontrado `$queryRawUnsafe`, `$executeRawUnsafe`, `eval` ou CORS `*` em rota autenticada.
- Headers incluem CSP, bloqueio de frame, nosniff, referrer/permissions policy e HSTS em produção.
- Páginas sensíveis recebem cache privado/no-store.

## 4. Segurança residual e decisões manuais

| Risco residual | Nível | Próximo passo |
| --- | --- | --- |
| MFA não existe dentro do login administrativo | Alto operacional | Ativar MFA em Vercel/GitHub/Neon/PagBank/Cloudinary/Google e decidir implementação de WebAuthn/TOTP no app |
| Recuperação por e-mail ainda não está implementada | Médio | Escolher provedor, token único com expiração/hash e revogação de sessões; não divulgar o recurso como pronto |
| Rate limit é por instância | Médio | Ativar Vercel Firewall/Bot Protection e adotar armazenamento distribuído quando o tráfego exigir |
| PagBank/Cloudinary/Google reais não foram exercitados | Alto operacional | Validar no Preview com Sandbox e dados fictícios antes de Production |
| Backup/restore não foi provado | Alto operacional | Ativar backup Neon e restaurar uma cópia em branch/banco separado |
| CSP ainda usa `unsafe-inline` para compatibilidade com Next | Médio | Migrar para nonce em mudança isolada, validando Auth/Google/PagBank; não endurecer às cegas |
| Credencial Neon já foi compartilhada fora do painel seguro | Alto operacional | Rotacionar no Neon e atualizar Vercel; nenhum valor foi reproduzido neste relatório |
| Teste de carga e última unidade com múltiplos processos Vercel | Médio | Executar teste controlado em Preview; o código já usa operação atômica, mas não houve carga distribuída real |
| Logs/alertas centralizados | Médio | Conectar Sentry/serviço equivalente e alertas Vercel sem registrar PII/secrets |

## 5. UI/UX, responsividade, acessibilidade e SEO

- Home mostra produto cedo; hero permanece compacto e categorias funcionam como atalhos de loja.
- Cards exibem preço, estoque e ações `Adicionar ao carrinho` e `Comprar agora`; SKU e ação duplicada foram removidos da vitrine.
- Produtos esgotados somem das vitrines, aparecem apenas na busca, por último, com aviso vermelho.
- Checkout conserva campos/seleção, explica os erros e impede duplo envio.
- Admin abre cadastro por botão no início e fecha editor após salvar; tabelas/cards se adaptam em telas menores.
- Header, logo e busca foram verificados sem corte/overflow nas larguras solicitadas.
- Imagens possuem `alt`/fallback e tamanho responsivo; áreas privadas usam `noindex`.
- Não foi executado Lighthouse nesta rodada; portanto não há número de Core Web Vitals “antes/depois”. A revisão de performance foi estática e visual (imagens responsivas, carregamento e ausência de overflow).

Larguras verificadas manualmente no navegador: 320, 360, 375, 390, 430, 768, 1024, 1280 e 1440 px. Também houve Playwright em desktop, Pixel 5 e tablet 810 px. Não apareceu rolagem horizontal nas rotas cobertas.

## 6. Testes executados

| Comando/teste | Resultado real |
| --- | --- |
| `npm audit --audit-level=low` | 0 vulnerabilidades conhecidas |
| `npm run db:generate` | Prisma Client gerado |
| `npm run db:validate` | Schema válido |
| `npm run typecheck` | Aprovado |
| `npm run lint` | Aprovado |
| `npm run test` | 13 arquivos, 45 testes aprovados |
| `npm run test:e2e` | 33 cenários aprovados em 2,1 min; banco `xnutri_test` |
| Playwright focal da loja após hardening final | 9/9 cenários aprovados em 43,2 s |
| `npm run build` | Aprovado; Next.js 16.2.12 gerou 24 páginas estáticas e todas as rotas dinâmicas |
| `npm run production:check` com valores sintéticos seguros | Aprovado sem expor valores; não valida o painel remoto |
| Scanner defensivo de segredos | `.env.local` ignorado; 0 arquivo de chave; 0 padrão de segredo de alto risco rastreado |
| Histórico Git, sem imprimir valores | URLs encontradas foram classificadas como exemplos/local; 0 commit classificado como credencial real pelo padrão seguro |

Cobertura E2E: loja, busca, produto, esgotado, carrinho/quantidade/persistência, cupom, CEP/frete, checkout/duplo clique, pedido, cron, webhook falso/divergente/repetido/fora de ordem, retomada PagBank, login, RBAC, API sem sessão, admin CRUD/auditoria, PDV/pagamento misto/idempotência e responsividade.

### Não foi possível validar neste ambiente

- Preview Deployment ou Production Deployment na Vercel.
- Credenciais e painel remoto atuais da Vercel.
- Pagamento real ou Sandbox externo do PagBank e entrega pública do webhook.
- Upload real no Cloudinary.
- Google OAuth real.
- Restore de backup Neon.
- E-mail transacional/recuperação, pois a integração ainda não existe.
- Teste de carga/DDoS, antifraude e observabilidade externa.

## 7. Red team interno controlado

- `/admin` ou APIs administrativas sem sessão: bloqueados nos testes.
- Cliente em `/admin`/`/pdv`: bloqueado; caixa e gerente respeitam módulos.
- Alterar preço/frete/desconto/role/status pelo frontend: não é fonte de verdade; servidor recalcula/valida.
- Comprar acima do estoque: reserva atômica recusa; edição administrativa respeita reserva.
- Repetir venda, pedido, expiração ou webhook: chaves/movimentos/marcadores idempotentes.
- Acessar pedido alheio: exige proprietário autenticado ou token opaco correto.
- Webhook sem assinatura, valor divergente ou aprovação sem cobrança: recusado.
- XSS/query injection: sanitização/escaping/ORM parametrizado; nenhum raw unsafe encontrado.
- Upload malicioso: rota exige permissão, formato permitido, bytes reais e limite.
- SSRF/open redirect: nenhuma função genérica de proxy/importação de URL foi encontrada; imagens têm allowlist.
- Segredo no bundle: nenhum padrão privado encontrado; somente variáveis públicas deliberadas usam `NEXT_PUBLIC_`.
- Stack trace público: telas foram ajustadas e APIs usam mensagens controladas.

## 8. Banco e migrations

Migrations adicionadas:

- `20260815120000_add_pos_sale_idempotency` — coluna/chave única do PDV.
- `20260815123000_track_coupon_usage_release` — marcador de liberação de uso do cupom.
- `20260815124500_add_financial_integrity_checks` — checks financeiros não destrutivos.

Foram aplicadas somente nos bancos Docker locais `xnutri` e `xnutri_test`. Produção/Neon não foi alterada. Antes de Production: backup, Preview separado, revisão SQL, `prisma migrate deploy` e smoke test. Rollback exige migration revisada: remover primeiro as constraints, depois índice/colunas apenas se o código já tiver sido revertido e houver backup.

## 9. Arquivos alterados por área

- Segurança/auth: `src/auth.ts`, `src/lib/actions/auth.ts`, `src/lib/auth/password.ts`, `scripts/check-production-env.ts`.
- E-commerce: `src/lib/ecommerce/orders.ts`, `coupons.ts`, `order-status.ts`, `inventory.ts` (revisado), validações e páginas/actions admin.
- PagBank/PDV: `src/lib/payments/pagbank*.ts`, checkout/webhook, `src/lib/actions/pos.ts`, terminal PDV e schema/migrations.
- Checkout/UI: formulário de checkout, carrinho, cards/galeria, header, WhatsApp, imagens seguras e páginas de erro.
- SEO/admin PWA: metadata/robots/layouts, manifest administrativo protegido, service worker sem cache privado e botão só para `ADMIN`.
- Testes: componentes, unidades e E2E de loja/PDV/permissões/responsividade.
- Documentação: guia único, README, decisões, testes e este relatório; tutoriais antigos de Hostinger/Mercado Pago foram removidos.

## 10. Checklist antes de produção

- [x] Build, lint, tipos, Prisma, unitários e E2E locais executados.
- [x] Preço/frete/desconto/estoque calculados ou confirmados no servidor.
- [x] `/admin`, `/pdv`, APIs e pedidos protegidos no servidor.
- [x] Hash de senha, cookies de produção, RBAC, origem, validação e logs de auditoria revisados.
- [x] Webhook assinado, valor/moeda/cobrança e idempotência cobertos localmente.
- [x] Upload, XSS, injection, CSRF/origem, IDOR, CORS, headers e secrets revisados.
- [x] Mobile/desktop e ausência de overflow nas páginas cobertas.
- [ ] Rotacionar credencial Neon já compartilhada.
- [ ] Criar banco Neon exclusivo de Preview e aplicar migrations com backup.
- [ ] Conferir todas as variáveis nos ambientes Preview e Production da Vercel.
- [ ] Validar Preview Vercel completo.
- [ ] Validar PagBank Sandbox/webhook público e Cloudinary real.
- [ ] Ativar MFA nos provedores e limitar `ADMIN` ao dono.
- [ ] Ativar/testar backup e restore.
- [ ] Configurar monitoramento/alertas e proteção de bots/rate limit distribuído.
- [ ] Implementar recuperação de senha antes de anunciá-la como disponível.
- [ ] Cadastrar fotos, estoque, endereço, fretes, políticas e dados reais da loja.

O guia operacional oficial é `GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md`.
