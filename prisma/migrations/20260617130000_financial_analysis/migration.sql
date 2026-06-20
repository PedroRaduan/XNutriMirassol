-- Financial management fields for managerial profit analysis.
ALTER TABLE "products"
  ADD COLUMN "packagingCost" DECIMAL(10, 2),
  ADD COLUMN "desiredMargin" DECIMAL(5, 2),
  ADD COLUMN "estimatedTaxRate" DECIMAL(5, 2);

ALTER TABLE "product_variants"
  ADD COLUMN "costPrice" DECIMAL(10, 2),
  ADD COLUMN "packagingCost" DECIMAL(10, 2);

ALTER TABLE "orders"
  ADD COLUMN "grossRevenue" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "netRevenue" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "productsCost" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "paymentFee" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "fixedFee" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "packagingCost" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "estimatedTax" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "shippingCostPaidByStore" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "grossProfit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "netProfit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "profitMargin" DECIMAL(6, 2) NOT NULL DEFAULT 0;

ALTER TABLE "order_items"
  ADD COLUMN "unitCost" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "unitPackagingCost" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "productCost" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "discountAllocated" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "paymentFeeAllocated" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "fixedFeeAllocated" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "shippingCostAllocated" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxAllocated" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "grossProfit" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "netProfit" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "profitMargin" DECIMAL(6, 2) NOT NULL DEFAULT 0;

CREATE TABLE "financial_settings" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'default',
  "mercadoPagoRate" DECIMAL(5, 2) NOT NULL DEFAULT 4.99,
  "fixedTransactionFee" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "estimatedTaxRate" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  "defaultPackagingCost" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "minimumMargin" DECIMAL(5, 2) NOT NULL DEFAULT 20,
  "lowMarginAlert" DECIMAL(5, 2) NOT NULL DEFAULT 10,
  "defaultShippingCostPaidByStore" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_settings_name_key" ON "financial_settings"("name");

INSERT INTO "financial_settings" (
  "id",
  "name",
  "mercadoPagoRate",
  "fixedTransactionFee",
  "estimatedTaxRate",
  "defaultPackagingCost",
  "minimumMargin",
  "lowMarginAlert",
  "defaultShippingCostPaidByStore",
  "updatedAt"
) VALUES (
  'default_financial_settings',
  'default',
  4.99,
  0,
  0,
  0,
  20,
  10,
  0,
  CURRENT_TIMESTAMP
) ON CONFLICT ("name") DO NOTHING;
