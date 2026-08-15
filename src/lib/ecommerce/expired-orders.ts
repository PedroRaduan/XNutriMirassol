import "server-only";

import { prisma } from "@/lib/db/prisma";
import { releaseCouponUsageForOrder } from "@/lib/ecommerce/coupons";
import { releaseInventoryReservationForOrder } from "@/lib/ecommerce/inventory";

export const ORDER_RESERVATION_MINUTES = 30;

type CleanupSource = "cron" | "cart" | "checkout";

/**
 * Releases abandoned reservations. The status transition and inventory/coupon
 * operations are idempotent, so a daily cron and opportunistic calls can race
 * without canceling or releasing the same order twice.
 */
export async function releaseExpiredOrders(options?: {
  batchSize?: number;
  source?: CleanupSource;
}) {
  const batchSize = Math.max(1, Math.min(options?.batchSize ?? 100, 100));
  const source = options?.source ?? "cron";
  const cutoff = new Date(Date.now() - ORDER_RESERVATION_MINUTES * 60_000);
  const candidates = await prisma.order.findMany({
    where: { status: "PENDING", createdAt: { lte: cutoff } },
    select: { id: true, orderNumber: true },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  let released = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const transitioned = await tx.order.updateMany({
          where: { id: candidate.id, status: "PENDING", createdAt: { lte: cutoff } },
          data: {
            status: "CANCELED",
            canceledAt: new Date(),
          },
        });
        if (transitioned.count !== 1) return false;

        await releaseInventoryReservationForOrder(
          tx,
          candidate.id,
          `Reserva expirada do pedido ${candidate.orderNumber}`,
        );
        await releaseCouponUsageForOrder(tx, candidate.id);
        await tx.auditLog.create({
          data: {
            action: "order.reservation.expired",
            entity: "orders",
            entityId: candidate.id,
            metadata: { reservationMinutes: ORDER_RESERVATION_MINUTES, source },
          },
        });
        return true;
      });
      if (outcome) released += 1;
    } catch (error) {
      failed += 1;
      console.error("Falha ao liberar reserva expirada", {
        orderId: candidate.id,
        source,
        message: error instanceof Error ? error.message : "erro desconhecido",
      });
    }
  }

  return { processed: candidates.length, released, failed };
}
