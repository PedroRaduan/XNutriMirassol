// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { getPagBankCheckoutUrl, mapPagBankMethod, mapPagBankStatus } from "@/lib/payments/pagbank-mappers";
import { validatePagBankWebhookSignature } from "@/lib/payments/pagbank-signature";

describe("mapeamento do PagBank", () => {
  it("seleciona somente o link PAY de navegação", () => {
    expect(getPagBankCheckoutUrl({
      links: [
        { rel: "SELF", href: "https://api.pagseguro.com/checkouts/CHEC_1", method: "GET" },
        { rel: "PAY", href: "https://pagamento.pagseguro.uol.com.br/pagamento?code=1", method: "GET" },
      ],
    })).toBe("https://pagamento.pagseguro.uol.com.br/pagamento?code=1");
  });

  it("não marca status desconhecido como aprovado", () => {
    expect(mapPagBankStatus("PAID")).toBe("APPROVED");
    expect(mapPagBankStatus("IN_ANALYSIS")).toBe("PENDING");
    expect(mapPagBankStatus("DECLINED")).toBe("REJECTED");
  });

  it("mapeia as formas de pagamento hospedadas", () => {
    expect(mapPagBankMethod("PIX")).toBe("PIX");
    expect(mapPagBankMethod("CREDIT_CARD")).toBe("CREDIT_CARD");
    expect(mapPagBankMethod("DEBIT_CARD")).toBe("DEBIT_CARD");
  });

  it("aceita somente a assinatura de webhook calculada sobre o corpo bruto", () => {
    const previousWebhookToken = process.env.PAGBANK_WEBHOOK_TOKEN;
    const previousToken = process.env.PAGBANK_TOKEN;
    const rawBody = '{"reference_id":"XN123","status":"PAID"}';
    process.env.PAGBANK_WEBHOOK_TOKEN = "webhook-test-token";
    delete process.env.PAGBANK_TOKEN;

    try {
      const signature = createHash("sha256").update(`webhook-test-token-${rawBody}`, "utf8").digest("hex");
      expect(validatePagBankWebhookSignature(rawBody, signature)).toBe(true);
      expect(validatePagBankWebhookSignature(rawBody, "0".repeat(64))).toBe(false);
      expect(validatePagBankWebhookSignature(`${rawBody} `, signature)).toBe(false);
    } finally {
      if (previousWebhookToken === undefined) delete process.env.PAGBANK_WEBHOOK_TOKEN;
      else process.env.PAGBANK_WEBHOOK_TOKEN = previousWebhookToken;
      if (previousToken === undefined) delete process.env.PAGBANK_TOKEN;
      else process.env.PAGBANK_TOKEN = previousToken;
    }
  });
});
