# Integrações

| Serviço | Uso | Configuração |
| --- | --- | --- |
| Vercel | hospedagem, Functions, Cron e logs | `vercel.json`, variáveis por ambiente |
| PostgreSQL gerenciado | banco de produção | `DATABASE_URL` pooler e `DIRECT_URL` migrations |
| PagBank | Checkout hospedado e webhook | `PAGBANK_*`, rota `/api/payments/pagbank/webhook` |
| Cloudinary | imagens de produto/banner | `CLOUDINARY_*` |
| Google | OAuth opcional | `GOOGLE_CLIENT_ID/SECRET` |

Nunca envie token ao navegador. O PagBank recebe dados de pagamento diretamente no checkout hospedado; a Vercel recebe somente webhook assinado.
