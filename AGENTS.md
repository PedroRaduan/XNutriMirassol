<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# XNutri — regras de manutenção

- Leia [GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md](GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md) antes de alterar infraestrutura, pagamento, autenticação ou banco.
- Mantenha Next.js, Auth.js, Prisma e PostgreSQL; a aplicação é publicada apenas na Vercel. Docker serve somente ao desenvolvimento local.
- Não exponha nem imprima segredos. `.env*` preenchido não é versionado; use `.env.example` como contrato.
- Toda mutação sensível exige validação Zod, checagem de origem e autorização no servidor. Não confie em dados do navegador para preço, estoque, cupom, frete, status ou papel.
- Preserve reserva/baixa idempotente de estoque, token opaco de pedido de visitante e validação de webhook PagBank.
- Antes de concluir mudança: `npm audit`, `npm run db:validate`, `npm run typecheck`, `npm run lint`, `npm run test`, E2E quando PostgreSQL de teste estiver disponível e `npm run build`.
- Para schema: crie migration não destrutiva, teste em banco isolado, documente rollback e nunca rode reset em produção.
- Não altere fluxo de pagamento, permissões, produção ou dados reais sem autorização explícita.
