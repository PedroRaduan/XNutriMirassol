import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function decrementInventoryForOrder(tx: Tx, orderId: string) {
  const existingMovement = await tx.inventoryMovement.findFirst({
    where: { orderId, type: "STOCK_OUT" },
    select: { id: true },
  });

  if (existingMovement) return;

  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });

  for (const item of order.items) {
    const inventory = await tx.inventory.findFirst({
      where: item.variantId
        ? { variantId: item.variantId }
        : { productId: item.productId, variantId: null },
    });

    if (!inventory || inventory.quantity - inventory.reserved < item.quantity) {
      throw new Error(`Estoque insuficiente para ${item.productName}.`);
    }

    const updated = await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: { decrement: item.quantity },
        available: inventory.quantity - item.quantity > 0,
      },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        orderId,
        type: "STOCK_OUT",
        quantity: item.quantity * -1,
        reason: `Baixa automática do pedido ${order.orderNumber}`,
        balance: updated.quantity,
      },
    });
  }
}
