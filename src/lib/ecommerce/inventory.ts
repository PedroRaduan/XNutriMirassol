import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

async function getOrderInventory(tx: Tx, orderId: string) {
  return tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });
}

async function findInventoryForOrderItem(tx: Tx, item: { productId: string; variantId: string | null; productName: string }) {
  const inventory = await tx.inventory.findFirst({
    where: item.variantId
      ? { variantId: item.variantId }
      : { productId: item.productId, variantId: null },
  });

  if (!inventory) throw new Error(`Estoque não encontrado para ${item.productName}.`);
  return inventory;
}

/** Reserve stock once an online order is created, before sending the customer to the gateway. */
export async function reserveInventoryForOrder(tx: Tx, orderId: string) {
  const existingReservation = await tx.inventoryMovement.findFirst({
    where: { orderId, type: "RESERVATION" },
    select: { id: true },
  });
  if (existingReservation) return;

  const order = await getOrderInventory(tx, orderId);
  for (const item of order.items) {
    const inventory = await findInventoryForOrderItem(tx, item);
    const reserved = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE "inventory"
      SET "reserved" = "reserved" + ${item.quantity},
          "available" = ("quantity" - ("reserved" + ${item.quantity})) > 0
      WHERE "id" = ${inventory.id}
        AND ("quantity" - "reserved") >= ${item.quantity}
      RETURNING "id"
    `;
    if (reserved.length !== 1) throw new Error(`Estoque insuficiente para ${item.productName}.`);

    await tx.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        orderId,
        type: "RESERVATION",
        quantity: item.quantity,
        reason: `Reserva temporária do pedido ${order.orderNumber}`,
        balance: inventory.quantity,
      },
    });
  }
}

/** Release a pending online order reservation without changing physical stock. */
export async function releaseInventoryReservationForOrder(tx: Tx, orderId: string, reason: string) {
  const reservation = await tx.inventoryMovement.findFirst({
    where: { orderId, type: "RESERVATION" },
    select: { id: true },
  });
  const existingRelease = await tx.inventoryMovement.findFirst({
    where: { orderId, type: "RELEASE" },
    select: { id: true },
  });
  if (!reservation || existingRelease) return false;

  const order = await getOrderInventory(tx, orderId);
  for (const item of order.items) {
    const inventory = await findInventoryForOrderItem(tx, item);
    const released = await tx.inventory.updateMany({
      where: { id: inventory.id, reserved: { gte: item.quantity } },
      data: { reserved: { decrement: item.quantity } },
    });
    if (released.count !== 1) throw new Error(`Reserva de estoque inválida para ${item.productName}.`);

    const updated = await tx.inventory.findUniqueOrThrow({ where: { id: inventory.id } });
    await tx.inventory.update({
      where: { id: inventory.id },
      data: { available: updated.quantity - updated.reserved > 0 },
    });
    await tx.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        orderId,
        type: "RELEASE",
        quantity: item.quantity * -1,
        reason,
        balance: updated.quantity,
      },
    });
  }
  return true;
}

export async function decrementInventoryForOrder(tx: Tx, orderId: string) {
  const existingMovement = await tx.inventoryMovement.findFirst({
    where: { orderId, type: "STOCK_OUT" },
    select: { id: true },
  });

  if (existingMovement) return;

  const order = await getOrderInventory(tx, orderId);
  const hasReservation = Boolean(await tx.inventoryMovement.findFirst({
    where: { orderId, type: "RESERVATION" },
    select: { id: true },
  }));

  for (const item of order.items) {
    const inventory = await findInventoryForOrderItem(tx, item);
    const decremented = hasReservation
      ? await tx.$queryRaw<Array<{ id: string }>>`
          UPDATE "inventory"
          SET "quantity" = "quantity" - ${item.quantity},
              "reserved" = "reserved" - ${item.quantity},
              "available" = (("quantity" - ${item.quantity}) - ("reserved" - ${item.quantity})) > 0
          WHERE "id" = ${inventory.id}
            AND "quantity" >= ${item.quantity}
            AND "reserved" >= ${item.quantity}
          RETURNING "id"
        `
      : await tx.inventory.updateMany({
          where: {
            id: inventory.id,
            quantity: { gte: item.quantity + inventory.reserved },
          },
          data: { quantity: { decrement: item.quantity } },
        });

    if ((Array.isArray(decremented) ? decremented.length : decremented.count) !== 1) {
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

  const order = await getOrderInventory(tx, orderId);

  for (const item of order.items) {
    const inventory = await findInventoryForOrderItem(tx, item);

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
