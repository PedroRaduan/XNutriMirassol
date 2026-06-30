import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createMercadoPagoPreference, getMercadoPagoCheckoutUrl } from "@/lib/payments/mercado-pago";
import { assertSameOrigin, getClientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  await assertSameOrigin();
  const ip = await getClientIp();
  const limited = rateLimit(`mp-preference:${ip}`, 20, 60_000);

  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit excedido." }, { status: 429 });
  }

  const body = (await request.json()) as { orderNumber?: string };

  if (!body.orderNumber) {
    return NextResponse.json({ error: "Pedido não informado." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: body.orderNumber },
    include: { items: true, payments: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const preference = await createMercadoPagoPreference(order);
  const checkoutUrl = getMercadoPagoCheckoutUrl(preference);
  await prisma.payment.update({
    where: { id: order.payments[0].id },
    data: {
      preferenceId: preference.id,
      checkoutUrl,
    },
  });

  return NextResponse.json({
    preferenceId: preference.id,
    checkoutUrl,
  });
}
