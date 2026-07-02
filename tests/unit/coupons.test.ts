import type { Coupon } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateDiscount, isCouponActive } from "@/lib/ecommerce/coupons";

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-1",
    code: "QA10",
    description: null,
    type: "PERCENTAGE",
    value: 10 as never,
    minSubtotal: null,
    maxDiscount: null,
    productIds: [],
    categoryIds: [],
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    usageCount: 0,
    perCustomerLimit: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("cupons", () => {
  it("rejeita cupom expirado ou com limite atingido", () => {
    expect(isCouponActive(coupon({ endsAt: new Date(Date.now() - 1000) }))).toBe(false);
    expect(isCouponActive(coupon({ usageLimit: 2, usageCount: 2 }))).toBe(false);
  });

  it("limita desconto percentual ao máximo configurado", () => {
    expect(calculateDiscount(coupon({ value: 50 as never, maxDiscount: 30 as never }), 200)).toBe(30);
  });

  it("não permite desconto fixo maior que o subtotal elegível", () => {
    expect(calculateDiscount(coupon({ type: "FIXED_AMOUNT", value: 500 as never }), 120)).toBe(120);
  });

  it("aplica desconto apenas aos produtos ou categorias selecionados", () => {
    const scoped = coupon({ productIds: ["p1"], categoryIds: ["c2"], value: 10 as never });
    const discount = calculateDiscount(scoped, 300, 0, [
      { productId: "p1", categoryId: "c1", total: 100 },
      { productId: "p2", categoryId: "c2", total: 80 },
      { productId: "p3", categoryId: "c3", total: 120 },
    ]);
    expect(discount).toBe(18);
  });

  it("frete grátis desconta somente o valor do frete", () => {
    expect(calculateDiscount(coupon({ type: "FREE_SHIPPING" }), 200, 24.9)).toBe(24.9);
  });
});
