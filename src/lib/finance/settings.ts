import { prisma } from "@/lib/db/prisma";
import { defaultFinancialSettings, type FinancialSettingsValues } from "@/lib/finance/calculations";
import { toNumber } from "@/lib/utils";

export async function getFinancialSettings(): Promise<FinancialSettingsValues> {
  try {
    const settings = await prisma.financialSettings.findFirst({ orderBy: { createdAt: "asc" } });
    if (!settings) return defaultFinancialSettings;

    return {
      mercadoPagoRate: toNumber(settings.mercadoPagoRate),
      fixedTransactionFee: toNumber(settings.fixedTransactionFee),
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
