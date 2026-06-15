import type { Coupon } from "@prisma/client";
import { toNumber } from "@/lib/utils";

export function isCouponActive(coupon: Coupon) {
  const now = new Date();
  if (!coupon.active) return false;
  if (coupon.startsAt && coupon.startsAt > now) return false;
  if (coupon.endsAt && coupon.endsAt < now) return false;
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return false;
  return true;
}

export function calculateDiscount(coupon: Coupon | null, subtotal: number, shippingCost = 0) {
  if (!coupon || !isCouponActive(coupon)) return 0;
  if (coupon.minSubtotal && subtotal < toNumber(coupon.minSubtotal)) return 0;

  if (coupon.type === "FREE_SHIPPING") {
    return shippingCost;
  }

  if (coupon.type === "FIXED_AMOUNT") {
    return Math.min(toNumber(coupon.value), subtotal);
  }

  const raw = subtotal * (toNumber(coupon.value) / 100);
  const maxDiscount = coupon.maxDiscount ? toNumber(coupon.maxDiscount) : raw;
  return Math.min(raw, maxDiscount, subtotal);
}
