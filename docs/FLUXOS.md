# Fluxos críticos

## Compra

Carrinho → checkout com Zod/origem/rate limit → transação de pedido, cupom e reserva → link PagBank → webhook assinado → baixa idempotente → pedido pago/preparação.

## Estoque

Admin/PDV e webhook usam movimentos de estoque. `RESERVATION`, `RELEASE`, `STOCK_OUT` e `RETURN` impedem baixa ou devolução duplicada por índices únicos.

## Acesso

Cliente autenticado acessa pedido próprio. Visitante recebe `?access=` opaco; somente SHA-256 é persistido. Admin e PDV exigem sessão interna ativa.

## Incidentes

Pagamento divergente não aprova pedido. Falha de webhook retorna erro sem segredo e deve ser reprocessada pelo PagBank após correção.
