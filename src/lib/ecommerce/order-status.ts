import type { OrderStatus, ShippingType } from "@prisma/client";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "AWAITING_PICKUP", "CANCELED"],
  PAID: ["PREPARING", "AWAITING_PICKUP", "SHIPPED", "CANCELED", "REFUNDED"],
  PREPARING: ["AWAITING_PICKUP", "SHIPPED", "CANCELED", "REFUNDED"],
  AWAITING_PICKUP: ["DELIVERED", "CANCELED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELED: [],
  REFUNDED: [],
};

export function canTransitionOrderStatus(
  current: OrderStatus,
  next: OrderStatus,
  shippingType: ShippingType,
) {
  if (current === next) return true;
  if (next === "AWAITING_PICKUP" && shippingType !== "PICKUP") return false;
  if (next === "SHIPPED" && shippingType !== "DELIVERY") return false;
  return transitions[current].includes(next);
}

export function availableOrderStatuses(current: OrderStatus, shippingType: ShippingType) {
  const candidates = [current, ...transitions[current]];
  return candidates.filter((status, index) => (
    candidates.indexOf(status) === index && canTransitionOrderStatus(current, status, shippingType)
  ));
}
