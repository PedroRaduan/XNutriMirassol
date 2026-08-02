import { prisma } from "@/lib/db/prisma";
import { defaultFinancialSettings, type FinancialSettingsValues } from "@/lib/finance/calculations";
import { toNumber } from "@/lib/utils";

export async function getFinancialSettings(): Promise<FinancialSettingsValues> {
  try {
    const settings = await prisma.financialSettings.findFirst({ orderBy: { createdAt: "asc" } });
    if (!settings) return defaultFinancialSettings;

    return {
      pagBankRate: toNumber(settings.pagBankRate),
      fixedTransactionFee: toNumber(settings.fixedTransactionFee),
      posCashRate: toNumber(settings.posCashRate),
      posPixRate: toNumber(settings.posPixRate),
      posDebitRate: toNumber(settings.posDebitRate),
      posCreditRate: toNumber(settings.posCreditRate),
      posPagBankRate: toNumber(settings.posPagBankRate),
      allowNegativeStock: settings.allowNegativeStock,
      estimatedTaxRate: toNumber(settings.estimatedTaxRate),
      defaultPackagingCost: toNumber(settings.defaultPackagingCost),
      minimumMargin: toNumber(settings.minimumMargin),
      lowMarginAlert: toNumber(settings.lowMarginAlert),
      defaultShippingCostPaidByStore: toNumber(settings.defaultShippingCostPaidByStore),
    };
  } catch {
    return defaultFinancialSettings;
  }
}
