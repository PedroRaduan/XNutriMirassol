# XNutri

E-commerce de suplementos e moda fitness, com loja pública, área do cliente, painel administrativo, PDV, estoque e checkout PagBank.

## Tutorial oficial único

Use somente [GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md](GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md). Ele contém apenas as ações que ainda dependem do dono da loja: PagBank, teste Google, rotação Neon, dados reais, criação da conta da funcionária, instalação dos PWAs, backup/MFA, aprovação do Preview e publicação.

Evidências, correções, riscos residuais e limitações da revisão mais recente estão em [docs/AUDITORIA_COMPLETA_2026-08-15.md](docs/AUDITORIA_COMPLETA_2026-08-15.md).

## Comandos principais

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm ci
docker compose up -d
npm run db:deploy
npm run dev
```

Criar uma funcionária limitada ao PDV:

```powershell
npm run cashier:create -- "funcionaria@seudominio.com.br" $SENHA_CAIXA "Nome da funcionária"
```

Validação antes de publicar:

```powershell
npm audit
npm run db:validate
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

Os tutoriais antigos e contraditórios foram removidos. Não apague `AGENTS.md`, `.env.example`, `.env.production.example`, `prisma/migrations/` ou os documentos técnicos em `docs/`: eles fazem parte do projeto e não são tutoriais.
