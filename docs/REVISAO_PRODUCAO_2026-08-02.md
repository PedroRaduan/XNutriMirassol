# Revisão de produção — 02/08/2026

## Resumo executivo

Estado inicial confirmado: dependências com vulnerabilidades críticas/altas, pagamento/documentação misturando Mercado Pago e PagBank, pedido de visitante acessível só pelo número, estoque sem reserva durante checkout e painel local redirecionando ao domínio configurado. Estado após correções: dependências auditadas sem vulnerabilidades conhecidas, PagBank preparado, acesso de pedido com token, reserva idempotente e cron Vercel incluídos, documentação consolidada.

Não foi possível concluir E2E/migrations em banco isolado porque Docker Desktop não está executando neste ambiente. Não foi publicado Preview: o projeto Vercel existente não possui PagBank, Cron, Cloudinary nem variáveis de Preview.

## Constatações

| ID | Gravidade | Evidência | Local | Status / correção | Risco residual |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | Crítica | `npm audit` inicial encontrou Next/Auth vulneráveis | `package.json` | Corrigido: Next 16.2.12, Auth beta.32, Prisma/Tailwind/Vite e overrides; `npm audit` final: 0 | Repetir audit continuamente |
| SEC-02 | Alta | Checkout de visitante aceitava só `orderNumber` | pedido e API PagBank | Corrigido: token aleatório, hash SHA-256 e checagem de dono/token | Token é bearer; não compartilhar URL |
| SEC-03 | Alta | Unidades não eram reservadas enquanto pagamento pendia | checkout/inventory | Corrigido: reserva transacional, movimentos e cron de expiração | Cron/`CRON_SECRET` precisam estar ativos |
| SEC-04 | Alta | Vínculo automático Google por e-mail marcado perigoso | `src/auth.ts` | Corrigido: removido `allowDangerousEmailAccountLinking` | Usuário existente precisa usar senha até fluxo explícito de vínculo |
| SEC-05 | Alta | Configuração e código divergiam entre Mercado Pago/PagBank | pagamentos, env, docs | Corrigido para novos pedidos PagBank; rotas antigas retornam 410 | Teste sandbox pendente |
| SEC-06 | Média | Rate limit em memória não é distribuído em serverless | `rate-limit.ts` | Documentado; Vercel Firewall/Bot Protection obrigatório conforme tráfego | Recomendado provider distribuído antes de alto volume |
| SEC-07 | Média | CSP requer `unsafe-inline` por compatibilidade | `next.config.ts` | Mantida com headers restantes e entradas sanitizadas | Migração para nonce requer teste completo |
| SEC-08 | Média | Recuperação de senha ainda não envia/reset via e-mail | `actions/auth.ts` | Registrado; não existe link de redefinição funcional | Implementar provedor de e-mail e token de uso único antes de divulgar recurso |
| OPS-01 | Alta operacional | Vercel remoto tem apenas banco/Auth em Production | `vercel env ls` | Pendente manual: PagBank, Cron, Cloudinary e Preview | Não publicar checkout até completar |
| QA-01 | Média | PostgreSQL de teste indisponível (`ECONNREFUSED`) | `test:db:reset` | Pendente: iniciar Docker e executar E2E | E2E e migrations ainda não confirmados localmente |

## Evidências de teste

| Comando | Resultado |
| --- | --- |
| `npm audit` | aprovado, 0 vulnerabilidades conhecidas |
| `npm run db:validate` | aprovado |
| `npx next typegen` e `npm run typecheck` | aprovado |
| `npm run lint` | aprovado |
| `npm run test` | 10 arquivos, 35 testes aprovados |
| `npm run build` | aprovado com Next 16.2.12 |
| `npm run production:check` com configuração simulada segura | aprovado |
| `npm run test:db:reset` | bloqueado: Docker/PostgreSQL local desligado |
| Preview Vercel | bloqueado por variáveis ausentes e ausência de ambiente Preview |

## Próximas ações manuais

1. Rotacionar qualquer token de banco que tenha sido compartilhado fora do painel seguro.
2. Adicionar na Vercel (Preview e Production) `PAGBANK_ENVIRONMENT`, `PAGBANK_TOKEN`, `PAGBANK_WEBHOOK_TOKEN`, `CRON_SECRET` e `CLOUDINARY_*`.
3. Criar banco Preview separado ou credencial com isolamento adequado; nunca usar banco Production em testes.
4. Subir Docker, executar `npm run test:e2e`, testar migrations no banco isolado e validar PagBank sandbox/webhook.
5. Fazer Preview Deployment, revisar logs/headers, depois promover.
