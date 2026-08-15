import { describe, expect, it } from "vitest";
import { availableOrderStatuses, canTransitionOrderStatus } from "@/lib/ecommerce/order-status";

describe("transições de status de pedido", () => {
  it("não permite reabrir nem retroceder pedidos finalizados", () => {
    expect(canTransitionOrderStatus("DELIVERED", "PENDING", "DELIVERY")).toBe(false);
    expect(canTransitionOrderStatus("CANCELED", "PAID", "DELIVERY")).toBe(false);
    expect(canTransitionOrderStatus("REFUNDED", "PREPARING", "DELIVERY")).toBe(false);
  });

  it("separa transições de entrega e retirada", () => {
    expect(canTransitionOrderStatus("PAID", "SHIPPED", "DELIVERY")).toBe(true);
    expect(canTransitionOrderStatus("PAID", "SHIPPED", "PICKUP")).toBe(false);
    expect(canTransitionOrderStatus("PAID", "AWAITING_PICKUP", "PICKUP")).toBe(true);
    expect(canTransitionOrderStatus("PAID", "AWAITING_PICKUP", "DELIVERY")).toBe(false);
  });

  it("oferece ao admin somente o estado atual e os próximos válidos", () => {
    expect(availableOrderStatuses("SHIPPED", "DELIVERY")).toEqual(["SHIPPED", "DELIVERED", "REFUNDED"]);
  });
});
