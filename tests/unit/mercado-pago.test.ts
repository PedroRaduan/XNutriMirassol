// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getMercadoPagoCheckoutUrl, mapMercadoPagoMethod, mapMercadoPagoStatus } from "@/lib/payments/mercado-pago-mappers";

describe("mapeamento do Mercado Pago", () => {
  it("mapeia status sem marcar pagamento desconhecido como aprovado", () => {
    expect(mapMercadoPagoStatus("approved")).toBe("APPROVED");
    expect(mapMercadoPagoStatus("refunded")).toBe("REFUNDED");
    expect(mapMercadoPagoStatus("in_process")).toBe("PENDING");
  });

  it("mapeia formas de pagamento", () => {
    expect(mapMercadoPagoMethod("pix", "bank_transfer")).toBe("PIX");
    expect(mapMercadoPagoMethod("visa", "credit_card")).toBe("CREDIT_CARD");
    expect(mapMercadoPagoMethod("master", "debit_card")).toBe("DEBIT_CARD");
  });

  it("escolhe URL sandbox por padrão", () => {
    const previous = process.env.MERCADO_PAGO_ENVIRONMENT;
    process.env.MERCADO_PAGO_ENVIRONMENT = "sandbox";
    expect(getMercadoPagoCheckoutUrl({ init_point: "https://prod", sandbox_init_point: "https://sandbox" })).toBe("https://sandbox");
    process.env.MERCADO_PAGO_ENVIRONMENT = previous;
  });
});
