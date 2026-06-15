# Guia para Gerenciar Estoque

## Estrutura

- `inventory`: saldo atual por produto/variação.
- `inventory_movements`: histórico completo de entradas, saídas, reservas, liberações e ajustes.

## Baixa automática

Quando Mercado Pago confirma pagamento:

1. Webhook sincroniza pagamento.
2. Pedido muda para `PAID`.
3. Sistema executa baixa por item.
4. Movimento `STOCK_OUT` é registrado.

## Ajuste manual

1. Acesse `/admin/estoque`.
2. Informe novo saldo e motivo.
3. Salve.

O sistema registra o saldo anterior, novo saldo e responsável administrativo no histórico.

## Alertas

Itens com quantidade menor ou igual ao limite aparecem no dashboard como estoque baixo.
