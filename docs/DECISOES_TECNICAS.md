# Decisões técnicas

- Vercel é a única hospedagem da aplicação; Docker é local.
- PostgreSQL gerenciado usa pooler na aplicação e conexão direta nas migrations.
- PagBank Checkout hospedado substitui Mercado Pago para novos pedidos; valores históricos não são apagados.
- Checkout reserva estoque no pedido e confirma apenas por webhook PagBank válido.
- Token de pedido de visitante é opaco e persistido somente como hash.
- Rate limit em memória é proteção complementar; produção requer Vercel Firewall/Bot Protection ou rate limit distribuído conforme volume.
- CSP foi mantida compatível com framework e integrações; endurecimento com nonce exige teste de regressão específico.
