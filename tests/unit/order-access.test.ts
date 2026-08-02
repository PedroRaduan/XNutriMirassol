import { describe, expect, it } from "vitest";
import { canAccessOrder, createOrderAccessToken } from "@/lib/ecommerce/order-access";

describe("acesso ao pedido", () => {
  it("permite ao dono autenticado acessar o próprio pedido", () => {
    expect(canAccessOrder({ userId: "customer-1", accessTokenHash: null }, { id: "customer-1" })).toBe(true);
  });

  it("recusa cliente diferente sem expor pedido alheio", () => {
    expect(canAccessOrder({ userId: "customer-1", accessTokenHash: null }, { id: "customer-2" })).toBe(false);
  });

  it("aceita visitante apenas com o token opaco correto", () => {
    const access = createOrderAccessToken();
    const order = { userId: null, accessTokenHash: access.hash };

    expect(canAccessOrder(order, null, access.token)).toBe(true);
    expect(canAccessOrder(order, null, "token-invalido-comprido-o-suficiente-para-validacao")).toBe(false);
  });
});
