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

    const decremented = await tx.inventory.updateMany({
      where: {
        id: inventory.id,
        quantity: { gte: item.quantity + inventory.reserved },
      },
      data: {
        quantity: { decrement: item.quantity },
      },
    });

    if (decremented.count !== 1) {
      throw new Error(`Estoque insuficiente para ${item.productName}.`);
    }

    const updated = await tx.inventory.findUniqueOrThrow({ where: { id: inventory.id } });
    const available = updated.quantity - updated.reserved > 0;
    if (updated.available !== available) {
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { available },
      });
    }

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

export async function restoreInventoryForOrder(tx: Tx, orderId: string, reason: string) {
  const existingReturn = await tx.inventoryMovement.findFirst({
    where: { orderId, type: "RETURN" },
    select: { id: true },
  });

  if (existingReturn) return false;

  const stockOut = await tx.inventoryMovement.findFirst({
    where: { orderId, type: "STOCK_OUT" },
    select: { id: true },
  });

  if (!stockOut) return false;

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

    if (!inventory) {
      throw new Error(`Estoque não encontrado para estornar ${item.productName}.`);
    }

    const updated = await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: { increment: item.quantity },
        available: true,
      },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        orderId,
        type: "RETURN",
        quantity: item.quantity,
        reason,
        balance: updated.quantity,
      },
    });
  }

  return true;
}
