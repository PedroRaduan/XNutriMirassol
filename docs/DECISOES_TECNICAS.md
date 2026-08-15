# Decisões técnicas

- Vercel é a única hospedagem da aplicação; Docker é local.
- PostgreSQL gerenciado usa pooler na aplicação e conexão direta nas migrations.
- PagBank Checkout hospedado substitui Mercado Pago para novos pedidos; valores históricos não são apagados.
- Checkout reserva estoque no pedido e confirma apenas por webhook PagBank válido.
- Criação de checkout PagBank e venda no PDV possuem chaves estáveis de idempotência; repetição não deve duplicar cobrança ou venda.
- Webhook nunca regride pagamento aprovado para pendente e sinaliza aprovação posterior a pedido terminal para revisão humana.
- Uso de cupom é serializado no banco e liberado uma única vez quando um pedido pendente expira ou é cancelado.
- Restrições financeiras foram adicionadas como `NOT VALID`: passam a proteger inserções/alterações imediatamente sem rejeitar o deploy por eventual legado; a validação completa do histórico deve ocorrer em manutenção separada.
- Estoque editável não pode ficar abaixo de `reserved`; exceções de estoque negativo no PDV continuam dependentes da política explícita do ambiente.
- Token de pedido de visitante é opaco e persistido somente como hash.
- Rate limit em memória é proteção complementar; produção requer Vercel Firewall/Bot Protection ou rate limit distribuído conforme volume.
- CSP foi mantida compatível com framework e integrações; endurecimento com nonce exige teste de regressão específico.
