-- NOT VALID keeps this deployment non-destructive for legacy rows while
-- enforcing the rules immediately for every new or updated record.
ALTER TABLE "products" ADD CONSTRAINT "products_nonnegative_values_check"
CHECK (
  "price" >= 0 AND
  ("compareAtPrice" IS NULL OR "compareAtPrice" >= 0) AND
  ("costPrice" IS NULL OR "costPrice" >= 0) AND
  ("packagingCost" IS NULL OR "packagingCost" >= 0) AND
  "weightGrams" >= 0 AND "widthCm" >= 0 AND "heightCm" >= 0 AND "lengthCm" >= 0
) NOT VALID;

ALTER TABLE "inventory" ADD CONSTRAINT "inventory_reservations_nonnegative_check"
CHECK ("reserved" >= 0 AND "lowStockThreshold" >= 0) NOT VALID;

ALTER TABLE "coupons" ADD CONSTRAINT "coupons_limits_check"
CHECK (
  "value" >= 0 AND "usageCount" >= 0 AND
  ("usageLimit" IS NULL OR "usageLimit" > 0) AND
  ("perCustomerLimit" IS NULL OR "perCustomerLimit" > 0)
) NOT VALID;

ALTER TABLE "orders" ADD CONSTRAINT "orders_nonnegative_totals_check"
CHECK (
  "subtotal" >= 0 AND "discount" >= 0 AND "shippingCost" >= 0 AND "total" >= 0 AND
  "grossRevenue" >= 0 AND "productsCost" >= 0 AND
  "paymentFee" >= 0 AND "fixedFee" >= 0 AND "packagingCost" >= 0 AND
  "estimatedTax" >= 0 AND "shippingCostPaidByStore" >= 0
) NOT VALID;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_positive_values_check"
CHECK (
  "quantity" > 0 AND "unitPrice" >= 0 AND "total" >= 0 AND "unitCost" >= 0 AND
  "unitPackagingCost" >= 0 AND "productCost" >= 0 AND "discountAllocated" >= 0 AND
  "paymentFeeAllocated" >= 0 AND "fixedFeeAllocated" >= 0 AND
  "shippingCostAllocated" >= 0 AND "taxAllocated" >= 0
) NOT VALID;

ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_nonnegative_check"
CHECK ("amount" >= 0) NOT VALID;

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_quantity_positive_check"
CHECK ("quantity" > 0) NOT VALID;

ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_nonnegative_totals_check"
CHECK (
  "subtotal" >= 0 AND "discountTotal" >= 0 AND "total" >= 0 AND
  "amountReceived" >= 0 AND "changeAmount" >= 0 AND "costTotal" >= 0 AND
  "feeTotal" >= 0 AND "packagingCost" >= 0 AND "estimatedTax" >= 0
) NOT VALID;

ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_positive_values_check"
CHECK (
  "quantity" > 0 AND "unitPrice" >= 0 AND "unitCost" >= 0 AND
  "unitPackagingCost" >= 0 AND "discount" >= 0 AND "subtotal" >= 0 AND "total" >= 0
) NOT VALID;

ALTER TABLE "pos_payments" ADD CONSTRAINT "pos_payments_nonnegative_values_check"
CHECK (
  "amount" >= 0 AND "fee" >= 0 AND
  ("amountReceived" IS NULL OR "amountReceived" >= 0) AND
  ("changeAmount" IS NULL OR "changeAmount" >= 0)
) NOT VALID;
