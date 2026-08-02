-- Guest order pages use an opaque bearer token. Only its SHA-256 hash is persisted.
ALTER TABLE "orders" ADD COLUMN "accessTokenHash" VARCHAR(64);

CREATE UNIQUE INDEX "orders_accessTokenHash_key" ON "orders"("accessTokenHash");
