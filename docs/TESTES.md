# Testes

Comandos oficiais:

```powershell
npm audit
npm run db:validate
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

E2E usa `xnutri_test`, nunca produção. Inicie Docker antes de `npm run test:db:reset`. Cobrir carrinho, checkout, token de pedido, estoque concorrente, PagBank sandbox/webhook, administração, PDV e telas mobile. Consulte o guia único para critérios e limitações registradas.

## Evidência mais recente

Consulte `AUDITORIA_COMPLETA_2026-08-15.md`. Ela separa claramente revisão estática, testes unitários, testes E2E locais e itens que dependem de Preview/PagBank/Cloudinary reais.
