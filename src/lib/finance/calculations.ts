export type FinancialSettingsValues = {
  mercadoPagoRate: number;
  fixedTransactionFee: number;
  posCashRate: number;
  posPixRate: number;
  posDebitRate: number;
  posCreditRate: number;
  posMercadoPagoRate: number;
  allowNegativeStock: boolean;
  estimatedTaxRate: number;
  defaultPackagingCost: number;
  minimumMargin: number;
  lowMarginAlert: number;
  defaultShippingCostPaidByStore: number;
};

export const defaultFinancialSettings: FinancialSettingsValues = {
  mercadoPagoRate: 4.99,
  fixedTransactionFee: 0,
  posCashRate: 0,
  posPixRate: 0,
  posDebitRate: 1.99,
  posCreditRate: 3.99,
  posMercadoPagoRate: 4.99,
  allowNegativeStock: false,
  estimatedTaxRate: 0,
  defaultPackagingCost: 0,
  minimumMargin: 20,
  lowMarginAlert: 10,
  defaultShippingCostPaidByStore: 0,
};

export function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function marginPercent(profit: number, revenue: number) {
  if (revenue <= 0) return 0;
  return roundMoney((profit / revenue) * 100);
}

export function calculateSuggestedPrice({
  costPrice,
  packagingCost = 0,
  desiredMargin = defaultFinancialSettings.minimumMargin,
  paymentRate = defaultFinancialSettings.mercadoPagoRate,
  taxRate = defaultFinancialSettings.estimatedTaxRate,
}: {
  costPrice: number;
  packagingCost?: number;
  desiredMargin?: number;
  paymentRate?: number;
  taxRate?: number;
}) {
  const denominator = 1 - desiredMargin / 100 - paymentRate / 100 - taxRate / 100;
  if (costPrice <= 0 || denominator <= 0) return 0;
  return roundMoney((costPrice + packagingCost) / denominator);
}

export function calculateUnitFinance({
  price,
  costPrice = 0,
  packagingCost = 0,
  discount = 0,
  paymentFee = 0,
  fixedFee = 0,
  shippingCostPaidByStore = 0,
  taxRate = 0,
}: {
  price: number;
  costPrice?: number;
  packagingCost?: number;
  discount?: number;
  paymentFee?: number;
  fixedFee?: number;
  shippingCostPaidByStore?: number;
  taxRate?: number;
}) {
  const netSale = Math.max(price - discount, 0);
  const tax = roundMoney(netSale * (taxRate / 100));
  const grossProfit = roundMoney(netSale - costPrice);
  const netProfit = roundMoney(grossProfit - packagingCost - paymentFee - fixedFee - shippingCostPaidByStore - tax);

  return {
    netSale: roundMoney(netSale),
    tax,
    grossProfit,
    netProfit,
    margin: marginPercent(netProfit, netSale),
  };
}
