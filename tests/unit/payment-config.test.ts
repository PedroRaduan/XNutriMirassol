import { afterEach, describe, expect, it } from "vitest";
import { isPagBankCheckoutEnabled } from "@/lib/payments/config";

const previousValue = process.env.PAGBANK_CHECKOUT_ENABLED;

afterEach(() => {
  if (previousValue === undefined) delete process.env.PAGBANK_CHECKOUT_ENABLED;
  else process.env.PAGBANK_CHECKOUT_ENABLED = previousValue;
});

describe("disponibilidade do checkout PagBank", () => {
  it("permanece habilitado por padrão", () => {
    delete process.env.PAGBANK_CHECKOUT_ENABLED;
    expect(isPagBankCheckoutEnabled()).toBe(true);
  });

  it.each(["false", "0", "off", "disabled"])("é bloqueado com %s", (value) => {
    process.env.PAGBANK_CHECKOUT_ENABLED = value;
    expect(isPagBankCheckoutEnabled()).toBe(false);
  });
});
