-- Admin roles and order statuses required by the operational panel.
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'MANAGER', 'VIEWER');

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PICKUP';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

ALTER TABLE "admin_users"
  ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'ADMIN';

ALTER TABLE "coupons"
  ADD COLUMN "productIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "categoryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
