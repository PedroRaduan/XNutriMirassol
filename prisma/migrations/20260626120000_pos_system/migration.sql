-- PDV integrado: caixa, vendas presenciais, pagamentos, estoque e codigos de barras.

ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'CASHIER';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'RETURN';

CREATE TYPE "POSSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "POSSaleStatus" AS ENUM ('COMPLETED', 'CANCELED', 'PARTIALLY_REFUNDED', 'REFUNDED');
CREATE TYPE "POSPaymentMethod" AS ENUM ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'MERCADO_PAGO');
CREATE TYPE "POSPaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'CANCELED');
CREATE TYPE "CashMovementType" AS ENUM ('OPENING', 'SALE', 'CASH_IN', 'CASH_OUT', 'REFUND', 'CLOSING', 'ADJUSTMENT');

ALTER TABLE "products"
  ADD COLUMN "barcode" TEXT,
  ADD COLUMN "ean" TEXT,
  ADD COLUMN "internalCode" TEXT;

CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");
CREATE UNIQUE INDEX "products_ean_key" ON "products"("ean");
CREATE UNIQUE INDEX "products_internalCode_key" ON "products"("internalCode");
CREATE INDEX "products_barcode_idx" ON "products"("barcode");
CREATE INDEX "products_ean_idx" ON "products"("ean");
CREATE INDEX "products_internalCode_idx" ON "products"("internalCode");

ALTER TABLE "product_variants"
  ADD COLUMN "barcode" TEXT,
  ADD COLUMN "ean" TEXT,
  ADD COLUMN "internalCode" TEXT;

CREATE UNIQUE INDEX "product_variants_barcode_key" ON "product_variants"("barcode");
CREATE UNIQUE INDEX "product_variants_ean_key" ON "product_variants"("ean");
CREATE UNIQUE INDEX "product_variants_internalCode_key" ON "product_variants"("internalCode");
CREATE INDEX "product_variants_barcode_idx" ON "product_variants"("barcode");
CREATE INDEX "product_variants_ean_idx" ON "product_variants"("ean");
CREATE INDEX "product_variants_internalCode_idx" ON "product_variants"("internalCode");

ALTER TABLE "financial_settings"
  ADD COLUMN "posCashRate" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "posPixRate" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "posDebitRate" DECIMAL(5, 2) NOT NULL DEFAULT 1.99,
  ADD COLUMN "posCreditRate" DECIMAL(5, 2) NOT NULL DEFAULT 3.99,
  ADD COLUMN "posMercadoPagoRate" DECIMAL(5, 2) NOT NULL DEFAULT 4.99,
  ADD COLUMN "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "pos_sessions" (
  "id" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "closedById" TEXT,
  "openingAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "closingAmount" DECIMAL(10, 2),
  "expectedAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "difference" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "status" "POSSessionStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pos_sales" (
  "id" TEXT NOT NULL,
  "saleNumber" TEXT NOT NULL,
  "customerId" TEXT,
  "cashierId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "subtotal" DECIMAL(12, 2) NOT NULL,
  "discountTotal" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12, 2) NOT NULL,
  "amountReceived" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "changeAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "costTotal" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "feeTotal" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "packagingCost" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "estimatedTax" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "grossProfit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "netProfit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "margin" DECIMAL(6, 2) NOT NULL DEFAULT 0,
  "status" "POSSaleStatus" NOT NULL DEFAULT 'COMPLETED',
  "paymentStatus" "POSPaymentStatus" NOT NULL DEFAULT 'PAID',
  "cancellationReason" TEXT,
  "receiptToken" TEXT NOT NULL,
  "fiscalStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
  "fiscalProvider" TEXT,
  "fiscalPayload" JSONB,
  "notes" TEXT,
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_sales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pos_sale_items" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "productNameSnapshot" TEXT NOT NULL,
  "skuSnapshot" TEXT NOT NULL,
  "barcodeSnapshot" TEXT,
  "quantity" INTEGER NOT NULL,
  "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
  "unitPrice" DECIMAL(10, 2) NOT NULL,
  "unitCost" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "unitPackagingCost" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "subtotal" DECIMAL(10, 2) NOT NULL,
  "total" DECIMAL(10, 2) NOT NULL,
  "grossProfit" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "netProfit" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "margin" DECIMAL(6, 2) NOT NULL DEFAULT 0,
  "attributes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_sale_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pos_payments" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "method" "POSPaymentMethod" NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "fee" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "status" "POSPaymentStatus" NOT NULL DEFAULT 'PAID',
  "amountReceived" DECIMAL(10, 2),
  "changeAmount" DECIMAL(10, 2),
  "externalReference" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cash_movements" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "saleId" TEXT,
  "type" "CashMovementType" NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pos_sales_saleNumber_key" ON "pos_sales"("saleNumber");
CREATE UNIQUE INDEX "pos_sales_receiptToken_key" ON "pos_sales"("receiptToken");

CREATE INDEX "pos_sessions_openedById_status_idx" ON "pos_sessions"("openedById", "status");
CREATE INDEX "pos_sessions_status_openedAt_idx" ON "pos_sessions"("status", "openedAt");
CREATE INDEX "pos_sales_cashierId_createdAt_idx" ON "pos_sales"("cashierId", "createdAt");
CREATE INDEX "pos_sales_customerId_createdAt_idx" ON "pos_sales"("customerId", "createdAt");
CREATE INDEX "pos_sales_sessionId_createdAt_idx" ON "pos_sales"("sessionId", "createdAt");
CREATE INDEX "pos_sales_status_createdAt_idx" ON "pos_sales"("status", "createdAt");
CREATE INDEX "pos_sale_items_saleId_idx" ON "pos_sale_items"("saleId");
CREATE INDEX "pos_sale_items_productId_idx" ON "pos_sale_items"("productId");
CREATE INDEX "pos_sale_items_variantId_idx" ON "pos_sale_items"("variantId");
CREATE INDEX "pos_payments_saleId_idx" ON "pos_payments"("saleId");
CREATE INDEX "pos_payments_method_createdAt_idx" ON "pos_payments"("method", "createdAt");
CREATE INDEX "cash_movements_sessionId_createdAt_idx" ON "cash_movements"("sessionId", "createdAt");
CREATE INDEX "cash_movements_saleId_idx" ON "cash_movements"("saleId");
CREATE INDEX "cash_movements_type_createdAt_idx" ON "cash_movements"("type", "createdAt");

ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pos_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "pos_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pos_payments" ADD CONSTRAINT "pos_payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "pos_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "pos_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_movements" ADD COLUMN "posSaleId" TEXT;
CREATE INDEX "inventory_movements_posSaleId_idx" ON "inventory_movements"("posSaleId");
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_posSaleId_fkey" FOREIGN KEY ("posSaleId") REFERENCES "pos_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
