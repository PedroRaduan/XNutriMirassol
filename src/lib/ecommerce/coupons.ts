import type { Coupon, Prisma } from "@prisma/client";
import { toNumber } from "@/lib/utils";

export type CouponDiscountItem = {
  productId: string;
  categoryId?: string | null;
  total: number;
};

export function isCouponActive(coupon: Coupon) {
  const now = new Date();
  if (!coupon.active) return false;
  if (coupon.startsAt && coupon.startsAt > now) return false;
  if (coupon.endsAt && coupon.endsAt < now) return false;
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return false;
  return true;
}

function eligibleSubtotal(coupon: Coupon, subtotal: number, items: CouponDiscountItem[] = []) {
  const hasProductScope = coupon.productIds.length > 0;
  const hasCategoryScope = coupon.categoryIds.length > 0;

  if (!hasProductScope && !hasCategoryScope) return subtotal;
  if (items.length === 0) return 0;

  return items.reduce((sum, item) => {
    const productMatches = hasProductScope && coupon.productIds.includes(item.productId);
    const categoryMatches = hasCategoryScope && item.categoryId && coupon.categoryIds.includes(item.categoryId);
    return productMatches || categoryMatches ? sum + item.total : sum;
  }, 0);
}

export function calculateDiscount(coupon: Coupon | null, subtotal: number, shippingCost = 0, items: CouponDiscountItem[] = []) {
  if (!coupon || !isCouponActive(coupon)) return 0;
  if (coupon.minSubtotal && subtotal < toNumber(coupon.minSubtotal)) return 0;

  if (coupon.type === "FREE_SHIPPING") {
    return shippingCost;
  }

  const baseSubtotal = eligibleSubtotal(coupon, subtotal, items);
  if (baseSubtotal <= 0) return 0;

  if (coupon.type === "FIXED_AMOUNT") {
    return Math.min(toNumber(coupon.value), baseSubtotal);
  }

  const raw = baseSubtotal * (toNumber(coupon.value) / 100);
  const maxDiscount = coupon.maxDiscount ? toNumber(coupon.maxDiscount) : raw;
  return Math.min(raw, maxDiscount, baseSubtotal);
}

/** Releases a coupon slot once an order becomes terminal. The conditional update makes retries idempotent. */
export async function releaseCouponUsageForOrder(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { couponId: true },
  });
  if (!order?.couponId) return false;

  const marked = await tx.order.updateMany({
    where: { id: orderId, couponId: order.couponId, couponUsageReleasedAt: null },
    data: { couponUsageReleasedAt: new Date() },
  });
  if (marked.count !== 1) return false;

  await tx.coupon.updateMany({
    where: { id: order.couponId, usageCount: { gt: 0 } },
    data: { usageCount: { decrement: 1 } },
  });
  return true;
}
