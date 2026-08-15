ALTER TABLE "pos_sales"
ADD COLUMN "idempotencyKey" VARCHAR(64);

CREATE UNIQUE INDEX "pos_sales_idempotencyKey_key"
ON "pos_sales"("idempotencyKey");
