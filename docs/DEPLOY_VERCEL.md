# Deploy na Vercel

Este projeto é implantado exclusivamente na Vercel. Importe o repositório, mantenha `npm ci` e `npm run vercel-build`, configure Production e Preview separadamente e valide Preview antes de promover. O build aplica migrations; faça backup e use `DIRECT_URL` direta.

O cron `/api/cron/release-expired-orders` usa `CRON_SECRET` e roda diariamente às 06:00 UTC para ser compatível com o Hobby. A loja também libera reservas vencidas ao usar carrinho/checkout. Configure domínio HTTPS, PagBank sandbox, Cloudinary e Google OAuth com callbacks do domínio. Use Deployments para logs/rollback; nunca faça rollback de banco sem plano de migration e backup.
