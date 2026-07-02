// @vitest-environment node
import { describe, expect, it } from "vitest";
import { decrementInventoryForOrder, restoreInventoryForOrder } from "@/lib/ecommerce/inventory";

function transactionFixture(initialQuantity = 5) {
  let quantity = initialQuantity;
  let available = initialQuantity > 0;
  const movements: Array<{ id: string; orderId: string; type: string; quantity: number; balance: number }> = [];
  const order = {
    id: "order-1",
    orderNumber: "XNQA001",
    items: [{ productId: "product-1", variantId: null, productName: "Produto QA", quantity: 2 }],
  };

  const tx = {
    inventoryMovement: {
      findFirst: async ({ where }: { where: { orderId: string; type: string } }) =>
        movements.find((movement) => movement.orderId === where.orderId && movement.type === where.type) ?? null,
      create: async ({ data }: { data: Omit<(typeof movements)[number], "id"> }) => {
        const movement = { id: `movement-${movements.length + 1}`, ...data };
        movements.push(movement);
        return movement;
      },
    },
    order: {
      findUniqueOrThrow: async () => order,
    },
    inventory: {
      findFirst: async () => ({ id: "inventory-1", productId: "product-1", variantId: null, quantity, reserved: 0, available }),
      updateMany: async ({ where, data }: { where: { quantity: { gte: number } }; data: { quantity: { decrement: number } } }) => {
        if (quantity < where.quantity.gte) return { count: 0 };
        quantity -= data.quantity.decrement;
        return { count: 1 };
      },
      findUniqueOrThrow: async () => ({ id: "inventory-1", quantity, reserved: 0, available }),
      update: async ({ data }: { data: { quantity?: { increment: number }; available?: boolean } }) => {
        if (data.quantity?.increment) quantity += data.quantity.increment;
        if (typeof data.available === "boolean") available = data.available;
        return { id: "inventory-1", quantity, reserved: 0, available };
      },
    },
  };

  return { tx, movements, getQuantity: () => quantity };
}

describe("movimentação de estoque do pedido", () => {
  it("baixa uma vez e ignora repetição do mesmo webhook", async () => {
    const fixture = transactionFixture(5);
    await decrementInventoryForOrder(fixture.tx as never, "order-1");
    await decrementInventoryForOrder(fixture.tx as never, "order-1");

    expect(fixture.getQuantity()).toBe(3);
    expect(fixture.movements.filter((movement) => movement.type === "STOCK_OUT")).toHaveLength(1);
  });

  it("bloqueia baixa acima do estoque", async () => {
    const fixture = transactionFixture(1);
    await expect(decrementInventoryForOrder(fixture.tx as never, "order-1")).rejects.toThrow("Estoque insuficiente");
    expect(fixture.getQuantity()).toBe(1);
  });

  it("estorna uma única vez depois da baixa", async () => {
    const fixture = transactionFixture(5);
    await decrementInventoryForOrder(fixture.tx as never, "order-1");
    expect(await restoreInventoryForOrder(fixture.tx as never, "order-1", "Reembolso QA")).toBe(true);
    expect(await restoreInventoryForOrder(fixture.tx as never, "order-1", "Reembolso repetido")).toBe(false);

    expect(fixture.getQuantity()).toBe(5);
    expect(fixture.movements.filter((movement) => movement.type === "RETURN")).toHaveLength(1);
  });
});
