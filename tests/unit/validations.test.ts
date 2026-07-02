import { describe, expect, it } from "vitest";
import {
  checkoutSchema,
  couponAdminSchema,
  inventoryAdjustmentSchema,
  optionalDocumentSchema,
  productAdminSchema,
} from "@/lib/validations";

describe("validações de entrada", () => {
  it("aceita CPF e CNPJ válidos e rejeita documentos repetidos", () => {
    expect(optionalDocumentSchema.safeParse("529.982.247-25").success).toBe(true);
    expect(optionalDocumentSchema.safeParse("04.252.011/0001-10").success).toBe(true);
    expect(optionalDocumentSchema.safeParse("111.111.111-11").success).toBe(false);
  });

  it("exige endereço e frete na entrega", () => {
    const result = checkoutSchema.safeParse({
      customerName: "Cliente QA",
      customerEmail: "qa@xnutri.test",
      customerPhone: "17999999999",
      shippingType: "DELIVERY",
      paymentMethod: "PIX",
      privacyConsent: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toEqual(expect.arrayContaining(["zipCode", "street", "number", "district", "city", "state", "shippingMethodId"]));
    }
  });

  it("aceita retirada sem endereço quando existe ponto de retirada", () => {
    const result = checkoutSchema.safeParse({
      customerName: "Cliente QA",
      customerEmail: "qa@xnutri.test",
      customerPhone: "17999999999",
      shippingType: "PICKUP",
      pickupLocationId: "pickup-1",
      paymentMethod: "PIX",
      privacyConsent: true,
    });

    expect(result.success).toBe(true);
  });

  it("bloqueia cupom percentual acima de 100%", () => {
    const result = couponAdminSchema.safeParse({
      code: "ABUSIVO",
      type: "PERCENTAGE",
      value: 101,
    });

    expect(result.success).toBe(false);
  });

  it("bloqueia estoque e preço negativos", () => {
    expect(inventoryAdjustmentSchema.safeParse({ inventoryId: "inv", quantity: -1, reason: "teste QA" }).success).toBe(false);
    expect(productAdminSchema.safeParse({
      categoryId: "cat",
      name: "Produto QA",
      sku: "QA-001",
      shortDescription: "Descrição curta válida",
      description: "Descrição completa válida para o produto de QA.",
      price: -1,
      status: "ACTIVE",
      imageUrls: "https://res.cloudinary.com/demo/image/upload/teste.jpg",
      stock: 1,
      weightGrams: 100,
      widthCm: 10,
      heightCm: 10,
      lengthCm: 10,
    }).success).toBe(false);
  });
});
