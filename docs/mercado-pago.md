# Guia Mercado Pago

## Integração implementada

- Criação de preferência Checkout Pro em `src/lib/payments/mercado-pago.ts`
- Rota de criação manual em `/api/payments/mercado-pago/preference`
- Webhook em `/api/payments/mercado-pago/webhook`
- Retorno de pagamento para `/pedido/[orderNumber]`
- Controle de status de pagamento e pedido

## Status

Pedidos usam:

- `PENDING`
- `PAID`
- `PREPARING`
- `SHIPPED`
- `DELIVERED`
- `CANCELED`

Pagamentos usam:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `REFUNDED`
- `CANCELED`

## Configuração

1. No painel Mercado Pago, copie o access token.
2. Configure:

```env
MERCADO_PAGO_ACCESS_TOKEN=...
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=...
```

3. Cadastre webhook:

```text
https://seudominio.com/api/payments/mercado-pago/webhook
```

4. Eventos: pagamentos.

## PIX e cartão

O Checkout Pro do Mercado Pago exibe PIX e cartão conforme configuração da conta. A preferência envia itens, pagador, frete, referência externa e URLs de retorno.

## Atualização automática

Ao receber pagamento aprovado, o webhook:

1. Localiza pedido por `external_reference`.
2. Atualiza pagamento.
3. Marca pedido como `PAID`.
4. Baixa estoque automaticamente.
5. Registra movimentação em `inventory_movements`.
