# Arquitetura

Fonte complementar: [guia único](../GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md).

- **Aplicação:** Next.js 16 App Router em Vercel Functions; `src/proxy.ts` protege `/admin` e `/pdv`.
- **Dados:** Prisma 7 + PostgreSQL gerenciado em produção; Docker PostgreSQL é somente local.
- **Autenticação:** Auth.js com credenciais e Google OAuth opcional; sessão JWT segura em produção.
- **Domínios:** loja pública, conta do cliente, `/admin`, `/pdv`, APIs de CEP/frete/upload/pagamento e Server Actions.
- **Integrações:** PagBank Checkout hospedado, Cloudinary, Google OAuth e frete configurável.
- **Estado:** carrinho e dados persistidos no banco/cookies; nenhum fluxo de produção exige disco local ou processo residente.

O browser nunca calcula valores financeiros definitivos. Checkout cria pedido e reserva de estoque em transação; o webhook PagBank assinado conclui o pagamento.
