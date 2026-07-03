import { describe, expect, it } from "vitest";
import {
  availableProductsFirst,
  getProductAvailableStock,
  hasProductAvailableStock,
} from "@/lib/ecommerce/product-stock";

describe("disponibilidade de produtos", () => {
  it("desconta reservas e nunca retorna estoque negativo", () => {
    const product = {
      inventory: [
        { quantity: 5, reserved: 2 },
        { quantity: 1, reserved: 4 },
      ],
    };

    expect(getProductAvailableStock(product)).toBe(3);
    expect(hasProductAvailableStock(product)).toBe(true);
    expect(getProductAvailableStock({ inventory: [{ quantity: 2, reserved: 2 }] })).toBe(0);
  });

  it("mantém a ordenação original dentro dos disponíveis e envia os esgotados ao final", () => {
    const products = [
      { id: "esgotado-1", inventory: [{ quantity: 0, reserved: 0 }] },
      { id: "disponivel-1", inventory: [{ quantity: 3, reserved: 0 }] },
      { id: "esgotado-2", inventory: [{ quantity: 1, reserved: 1 }] },
      { id: "disponivel-2", inventory: [{ quantity: 5, reserved: 2 }] },
    ];

    expect(availableProductsFirst(products).map((product) => product.id)).toEqual([
      "disponivel-1",
      "disponivel-2",
      "esgotado-1",
      "esgotado-2",
    ]);
  });
});
