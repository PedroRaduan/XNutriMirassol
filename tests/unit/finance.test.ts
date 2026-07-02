import { describe, expect, it } from "vitest";
import { calculateSuggestedPrice, calculateUnitFinance, marginPercent, roundMoney } from "@/lib/finance/calculations";

describe("cálculos financeiros", () => {
  it("arredonda valores monetários em centavos", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(Number.NaN)).toBe(0);
  });

  it("calcula preço sugerido preservando custos, taxas e margem", () => {
    expect(calculateSuggestedPrice({ costPrice: 50, packagingCost: 5, desiredMargin: 30, paymentRate: 5, taxRate: 5 })).toBe(91.67);
  });

  it("não sugere preço quando percentuais tornam a conta impossível", () => {
    expect(calculateSuggestedPrice({ costPrice: 50, desiredMargin: 90, paymentRate: 10 })).toBe(0);
  });

  it("calcula fotografia financeira da unidade", () => {
    const result = calculateUnitFinance({
      price: 100,
      costPrice: 40,
      packagingCost: 2,
      discount: 10,
      paymentFee: 4,
      fixedFee: 1,
      shippingCostPaidByStore: 5,
      taxRate: 10,
    });

    expect(result).toEqual({ netSale: 90, tax: 9, grossProfit: 50, netProfit: 29, margin: 32.22 });
    expect(marginPercent(result.netProfit, result.netSale)).toBe(32.22);
  });
});
