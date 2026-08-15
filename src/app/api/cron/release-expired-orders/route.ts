import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { releaseInventoryReservationForOrder } from "@/lib/ecommerce/inventory";
import { releaseCouponUsageForOrder } from "@/lib/ecommerce/coupons";

export const runtime = "nodejs";
export const maxDuration = 30;

const reservationMinutes = 30;
const batchSize = 100;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Vercel Cron: releases stock held by checkout sessions that were never paid. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const cutoff = new Date(Date.now() - reservationMinutes * 60_000);
  const candidates = await prisma.order.findMany({
    where: { status: "PENDING", createdAt: { lte: cutoff } },
    select: { id: true, orderNumber: true },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  let released = 0;
  for (const candidate of candidates) {
    const outcome = await prisma.$transaction(async (tx) => {
      const transitioned = await tx.order.updateMany({
        where: { id: candidate.id, status: "PENDING" },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
          notes: "Reserva de estoque expirada antes da confirmação de pagamento.",
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
          metadata: { reservationMinutes },
        },
      });
      return true;
    });
    if (outcome) released += 1;
  }

  return NextResponse.json({ processed: candidates.length, released });
}
