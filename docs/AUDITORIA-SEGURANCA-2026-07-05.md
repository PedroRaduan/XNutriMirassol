# HISTÓRICO — substituído pela revisão e guia de 02/08/2026. Consulte [o guia único](../GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md).

# Auditoria de segurança da XNutri — 05/07/2026

Escopo: aplicação Next.js, Auth.js, Prisma/PostgreSQL, loja pública, conta do cliente, admin, PDV, carrinho, checkout, Mercado Pago, Cloudinary, variáveis de ambiente, Git, dependências e configuração de produção.

Esta auditoria foi defensiva. Não foram executados ataques contra terceiros, brute force, DDoS, spam, varredura externa ou testes destrutivos. Nenhum valor de segredo é reproduzido neste documento.

## A. Resumo executivo

**Nível geral de risco antes da produção: alto.** O código possui boas proteções de autorização no servidor, validação de pagamento, upload e headers, mas ainda existem decisões externas importantes antes de aceitar pagamentos reais.

Principais cinco riscos restantes:

1. **Concorrência entre pagamento e estoque:** o estoque só é baixado após a aprovação. Duas compras podem ser pagas antes de a última transação detectar falta de estoque.
2. **Credencial do PostgreSQL compartilhada anteriormente:** a senha deve ser rotacionada antes da produção, mesmo não estando versionada no Git.
3. **Webhook do Mercado Pago não configurado no ambiente local auditado:** sem o segredo, a produção recusa notificações e não confirma pagamentos com segurança.
4. **Rate limit em memória:** não é global quando a aplicação roda em várias instâncias.
5. **Backup, restauração, monitoramento e alertas não comprovados:** esses controles dependem do provedor e precisam ser configurados e testados.

Antes de produção, são obrigatórios: rotacionar a credencial do banco compartilhada, configurar o segredo do webhook, decidir a estratégia de reserva de estoque, habilitar backup/restore e validar todas as variáveis no ambiente real.

## B. Tabela de vulnerabilidades

| Título | Severidade | Local afetado | Descrição e impacto | Correção | Status |
|---|---|---|---|---|---|
| Pagamento pode confirmar após esgotamento concorrente | Alta | `src/lib/ecommerce/orders.ts`, `src/lib/ecommerce/inventory.ts`, webhook | Pedidos pendentes não reservam estoque. Em concorrência, um pagamento aprovado pode encontrar estoque insuficiente e permanecer pendente, embora o cliente já tenha pago. | Definir reserva atômica com expiração ou baixa antes do pagamento e compensação em falha/cancelamento. | Precisa de decisão |
| Credencial do banco compartilhada fora do repositório | Alta | Configuração externa do Neon | Uma connection string foi compartilhada anteriormente. Não apareceu no Git, mas deve ser considerada exposta. | Rotacionar a senha no Neon e atualizar `DATABASE_URL` e `DIRECT_URL` em todos os ambientes. | Ação manual |
| Segredo do webhook ausente no ambiente auditado | Alta | `MERCADO_PAGO_WEBHOOK_SECRET` | A rota recusa webhooks em produção sem segredo; pagamentos não seriam sincronizados. | Configurar o segredo fornecido pelo Mercado Pago. O verificador de produção agora bloqueia Access Token sem esse segredo. | Ação manual |
| Seed com contas e senhas conhecidas | Alta | `prisma/seed.ts` | O seed criava ADMIN, MANAGER, CASHIER e cliente com senhas previsíveis e as imprimia no terminal. | Contas conhecidas agora só existem em banco cujo nome contém `test`; fora dele, ADMIN forte via ambiente é obrigatório e nenhuma senha é impressa. | Corrigido |
| Dados pessoais persistidos por 30 dias no navegador | Média | `src/components/checkout/checkout-form.tsx` | CPF, endereço, telefone e observações ficavam em `localStorage`, acessível a qualquer script da origem e persistente após fechar o navegador. | Rascunho movido para `sessionStorage`, com duração máxima de 24 horas; CPF e observações não são persistidos; versão antiga é removida. | Corrigido |
| Payload completo do Mercado Pago armazenado | Média | `src/lib/payments/mercado-pago.ts`, `payments.payload` | A resposta completa podia conter dados pessoais e metadados não utilizados. | Novos eventos salvam apenas identificadores, status, método, valor, moeda, datas e modo. Avaliar limpeza dos registros antigos. | Corrigido para novos dados |
| Rate limit não distribuído | Média | `src/lib/security/rate-limit.ts` | Contadores reiniciam por processo e não são compartilhados entre instâncias da Vercel. | Usar Redis/Upstash ou rate limit da plataforma antes de tráfego alto; o limitador local foi mantido e ampliado no carrinho. | Precisa de decisão |
| Ausência de backup/restore comprovado | Média | Neon/provedor de hospedagem | O repositório não prova backup automático, retenção ou teste de restauração. | Ativar backup/PITR conforme o plano e executar um restore de teste documentado. | Ação manual |
| Ausência de monitoramento e alertas externos | Média | Produção | Há auditoria interna, mas não foi encontrada integração de erros, uptime ou alertas de webhook/banco. | Configurar monitoramento de uptime e erros, com alerta para 5xx, banco indisponível e falha de webhook. | Ação manual |
| Privilégios do usuário PostgreSQL não verificados | Média | Neon/PostgreSQL | O código não consegue confirmar se a aplicação usa um owner/superuser em produção. Permissão excessiva amplia o impacto de comprometimento. | Usar papel de runtime com privilégios mínimos e reservar o papel de migração para `DIRECT_URL`. | Ação manual |
| Links administráveis aceitavam esquemas perigosos | Média | `src/lib/validations.ts`, banners e conteúdo da home | Um administrador comprometido poderia persistir um link como `javascript:`. | Links agora aceitam apenas caminho interno ou HTTPS; imagens exigem HTTPS onde aplicável. | Corrigido |
| Inputs públicos sem limites uniformes | Média | cadastro, login, checkout, endereço, newsletter e admin | Strings muito grandes aumentavam risco de abuso de CPU, memória, logs e banco. | Foram adicionados limites de e-mail, senha, nomes, telefone, endereço, textos e URLs no Zod. | Corrigido |
| Upload podia iniciar parsing de requisição excessiva | Média | `/api/admin/uploads/cloudinary` | O tamanho do arquivo era validado após `formData()`. | `Content-Length` excessivo é recusado antes do parsing, mantendo MIME, assinatura e limite real do arquivo. | Corrigido |
| JSON-LD sem escape específico de `<` | Baixa | layout público e página de produto | `JSON.stringify` sozinho não impede fechamento da tag `script` caso um dado persistido contenha essa sequência. | Serializador dedicado escapa caracteres HTML sensíveis; teste unitário adicionado. | Corrigido |
| Erro completo no console do navegador em produção | Baixa | `src/app/error.tsx`, `src/app/global-error.tsx` | Objetos de erro eram enviados ao console do cliente. | Log detalhado ficou restrito ao desenvolvimento; o usuário recebe apenas digest de suporte. | Corrigido |
| CSP ainda usa `unsafe-inline` para scripts | Média | `next.config.ts` | Reduz a força da CSP contra XSS, embora React escape conteúdo e entradas persistidas sejam sanitizadas. | Migrar para nonce/SRI exige decisão porque torna páginas dinâmicas ou usa recurso experimental e pode afetar Google/Mercado Pago. | Precisa de decisão |
| Admin sem MFA obrigatório | Média | Auth.js e operação da loja | Senha forte e rate limit existem, mas uma senha administrativa roubada ainda permite acesso. | Exigir Google com MFA para administradores ou adicionar segundo fator sem remover o login atual até migração controlada. | Precisa de decisão |
| Auth.js em versão beta | Baixa | `next-auth@5.0.0-beta.31` | Pré-release aumenta risco de mudança e regressão, embora `npm audit` esteja limpo. | Acompanhar release estável e atualizar somente com teste completo de login, sessão e OAuth. | Precisa de decisão |
| Semântica futura de `sslmode=require` | Informativa | `DATABASE_URL`, `DIRECT_URL`, driver `pg` | O driver atual trata `require` como verificação completa, mas a próxima versão principal pretende adotar a semântica menos rigorosa do libpq. | Após validar compatibilidade com o Neon, usar explicitamente `sslmode=verify-full` nas conexões. | Ação manual preventiva |
| Página de pedido funciona como link secreto | Baixa | `/pedido/[orderNumber]` | Visitantes sem login acessam status, itens, total e pagamento se possuírem o número aleatório. Isso suporta checkout convidado, mas o link não deve ser compartilhado. | Opcionalmente adicionar token de acesso separado ou exigir login para pedidos vinculados a usuário. | Precisa de decisão |
| Recuperação de senha ainda não envia/consome token | Baixa | `src/lib/actions/auth.ts` | A resposta evita enumeração, mas o fluxo está incompleto e não permite redefinição. | Implementar e-mail, token de uso único com hash e expiração, revogação de sessões e rate limit. | Precisa de decisão |
| Dependências com vulnerabilidade conhecida | Informativa | `package-lock.json` | `npm audit` completo e de produção retornaram zero vulnerabilidades. Existem atualizações de patch disponíveis. | Atualizar patches em ciclo separado e repetir toda a suíte. | Sem vulnerabilidade atual |
| Segredos versionados | Informativa | Git e `.env*` | `.env.local` está ignorado; histórico e árvore atual não apresentaram credencial real pelos padrões auditados. Exemplos encontrados são placeholders. | Manter secret scanning no CI e proteção de push. | Sem achado atual |
| IA/prompt injection | Informativa | Projeto inteiro | Não foram encontradas funcionalidades de IA, agentes ou ferramentas de modelo. | Reavaliar se IA for adicionada. | Não aplicável |
| Firebase/Supabase/S3 | Informativa | Projeto inteiro | Não foram encontrados esses serviços; o upload usa Cloudinary no servidor. | Revisar permissões no painel Cloudinary. | Não aplicável ao código |

## C. Correções aplicadas

- Botões **Adicionar ao carrinho** e **Comprar agora** disponibilizados em todos os cards com estoque; a compra imediata adiciona o item no servidor antes de abrir o checkout.
- Formulário de produtos passou a aceitar até 10 imagens do computador, com upload autenticado para o Cloudinary, limite de 4 MB por arquivo e validação de tipo e assinatura no servidor. Administradores e gerentes com permissão de escrita em produtos podem usar a rota.
- Seed protegido contra contas padrão fora do banco de teste; administrador real exige e-mail e senha forte por ambiente.
- Senhas removidas da saída do seed.
- Script `admin:create` passou a exigir e-mail válido e senha exclusiva de 12 a 128 caracteres com complexidade mínima.
- Placeholder duplicado de `DATABASE_URL` removido do `.env.local`; produção local voltou a conectar ao PostgreSQL.
- Rascunho do checkout movido de `localStorage` para `sessionStorage`; CPF e observações deixaram de ser persistidos.
- Limites de entrada adicionados com Zod e links editáveis limitados a caminhos internos ou HTTPS.
- Rate limit adicionado a inclusão/alteração de carrinho e tentativas de cupom.
- Payload persistido do Mercado Pago minimizado.
- Build de produção passou a exigir segredo de webhook quando há Access Token do Mercado Pago.
- Upload rejeita requisição muito grande antes de processar multipart.
- Módulos de banco, Cloudinary e Mercado Pago marcados como exclusivos do servidor.
- JSON-LD recebeu serialização segura contra fechamento de `script`.
- Erros completos deixaram de ser registrados no console do navegador em produção.
- Testes unitários adicionados para JSON-LD, limites de dados pessoais e links perigosos.

## D. Correções que precisam de ação manual

1. Rotacionar a senha do Neon que foi compartilhada anteriormente e atualizar as duas URLs no computador e na hospedagem.
2. Configurar `MERCADO_PAGO_WEBHOOK_SECRET` no mesmo ambiente do Access Token.
3. Escolher e implementar reserva de estoque com expiração para impedir pagamento de item esgotado em concorrência.
4. Ativar backup/PITR e testar restauração em banco separado.
5. Configurar monitoramento de uptime e erros com alertas.
6. Se usar Vercel com múltiplas instâncias, migrar rate limit para Redis/Upstash.
7. Criar usuário PostgreSQL de runtime com privilégio mínimo; manter usuário de migração separado.
8. Exigir MFA nas contas de provedor, Git, Vercel/Hostinger, Neon, Cloudinary, Google e Mercado Pago.
9. Revisar e, se permitido pela retenção fiscal/operacional, limpar payloads antigos de pagamento.
10. Configurar no Google OAuth apenas os domínios e callbacks reais da aplicação.
11. Revisar credenciais e restrições do Cloudinary; rotacionar se já foram compartilhadas fora de canal seguro.
12. Decidir se a CSP deve migrar para nonce/SRI após teste específico de performance e integrações.
13. Após confirmar compatibilidade no Neon, trocar o parâmetro SSL das URLs para `sslmode=verify-full` antes de uma futura atualização principal do driver `pg`.

## E. Testes realizados

- Inspeção estática de Server Actions, rotas API, layouts privados, Prisma, uploads, checkout, PDV, OAuth, webhook e logs.
- Busca de segredos na árvore atual e histórico Git sem imprimir valores.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- `npm audit`: 0 vulnerabilidades.
- ESLint: aprovado.
- TypeScript: aprovado.
- Vitest: 31 testes aprovados.
- Playwright E2E: 30 cenários aprovados em desktop, celular e tablet.
- Cards de produto: presença dos dois botões de compra confirmada por teste E2E.
- Upload no cadastro de produto: seleção do arquivo, preenchimento da URL e permissões validados sem enviar arquivo real para serviço externo durante o teste.
- Autenticação e autorização: deslogado, CLIENT, CASHIER, MANAGER e ADMIN.
- APIs privadas de PDV e upload: rejeição sem autenticação confirmada.
- Carrinho: adição, quantidade, persistência, cupom e remoção.
- Checkout: CEP válido/inválido, frete, preservação ao pressionar Enter, erros de campo e pedido único.
- PDV: abertura, estoque, desconto, pagamento misto e finalização.
- Build limpo Next.js/Prisma: aprovado.
- `next start`: home 200 e `/api/health` com banco conectado.
- Headers em produção: CSP, `DENY`, `nosniff`, Referrer-Policy, Permissions-Policy e HSTS presentes; `X-Powered-By` ausente.
- Catálogo em produção: 25 cards, 25 botões de adicionar, 25 botões de comprar agora e sem overflow horizontal em desktop ou 360 px.

## F. Checklist final antes de produção

- [ ] Rotacionar a credencial do Neon compartilhada anteriormente.
- [ ] Manter somente uma `DATABASE_URL` válida no painel da hospedagem.
- [ ] Usar URL pooler em `DATABASE_URL` e URL direta em `DIRECT_URL`.
- [ ] Validar e adotar `sslmode=verify-full` nas URLs do Neon.
- [ ] Configurar `AUTH_SECRET` aleatório com pelo menos 32 caracteres.
- [ ] Configurar domínio HTTPS idêntico em `NEXT_PUBLIC_APP_URL`, `AUTH_URL` e `NEXTAUTH_URL`.
- [ ] Restringir callbacks do Google OAuth ao domínio real.
- [ ] Configurar `MERCADO_PAGO_WEBHOOK_SECRET` e testar assinatura inválida/validada.
- [ ] Testar Mercado Pago em sandbox antes de habilitar produção.
- [ ] Decidir e implementar reserva de estoque antes de campanha ou alto volume.
- [ ] Criar primeiro administrador com senha exclusiva e MFA.
- [ ] Confirmar que nenhuma conta padrão de teste existe no banco de produção.
- [ ] Confirmar que CLIENT não acessa admin/PDV e CASHIER não acessa produtos/financeiro.
- [ ] Ativar backup/PITR e concluir um restore de teste.
- [ ] Configurar monitoramento de uptime, 5xx, banco e webhook.
- [ ] Configurar rate limit distribuído se houver mais de uma instância.
- [ ] Revisar retenção de dados de pagamentos e pedidos conforme LGPD e obrigações fiscais.
- [ ] Verificar Cloudinary com conta protegida por MFA e credenciais exclusivas.
- [ ] Executar `npm audit`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` e `npm run build` no commit final.
- [ ] Conferir logs após o primeiro deploy sem copiar tokens ou connection strings.
