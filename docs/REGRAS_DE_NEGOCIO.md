# Regras de negócio

Fonte oficial: [guia único](../GUIA_UNICO_IMPLEMENTACAO_SEGURANCA_E_VERCEL.md).

1. Produtos inativos ou sem estoque não podem ser comprados; itens sem estoque saem das vitrines principais.
2. Preço, frete, cupom, total e disponibilidade são recalculados no servidor no checkout.
3. Pedido pendente reserva estoque. Pagamento aprovado baixa estoque uma vez; cancelamento pendente libera; reembolso pago devolve.
4. Reserva expira após 30 minutos. Carrinho e checkout liberam vencidas durante o uso normal; no Vercel Hobby, cron diário às 06:00 UTC é a garantia adicional.
5. Só webhook PagBank assinado, com referência, moeda e valor válidos, confirma pagamento.
6. Cliente vê apenas os próprios pedidos; pedido de visitante exige token opaco da URL.
7. Mudanças administrativas e financeiras exigem autorização no servidor e ficam auditadas.
