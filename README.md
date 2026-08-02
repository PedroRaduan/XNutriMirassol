# XNutri

E-commerce de suplementos e moda fitness, com loja pública, área do cliente, painel administrativo, PDV, estoque e checkout PagBank.

## Guia oficial

Leia primeiro [GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md](GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md). Ele concentra instalação, banco, autenticação, PagBank, Cloudinary, segurança, testes, operação e deploy exclusivamente na Vercel.

## Comandos principais

```powershell
Copy-Item .env.example .env.local
npm ci
docker compose up -d
npm run db:deploy
npm run db:seed
npm run dev
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

## Documentação complementar

- [Arquitetura](docs/ARQUITETURA.md)
- [Permissões](docs/USUARIOS_E_PERMISSOES.md)
- [Regras de negócio](docs/REGRAS_DE_NEGOCIO.md)
- [Fluxos](docs/FLUXOS.md)
- [Integrações](docs/INTEGRACOES.md)
- [Testes](docs/TESTES.md)
- [Deploy Vercel](docs/DEPLOY_VERCEL.md)
- [Segurança](SECURITY.md)
- [Resposta a incidentes](docs/RESPOSTA_A_INCIDENTES.md)

Os arquivos antigos em `docs/` que citam Hostinger ou Mercado Pago são históricos. Não os use para configurar novo ambiente: a fonte atual é o guia único.
