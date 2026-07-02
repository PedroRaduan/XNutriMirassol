import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createMercadoPagoPreference, getMercadoPagoCheckoutUrl } from "@/lib/payments/mercado-pago";
import { assertSameOrigin, getClientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

const preferenceRequestSchema = z.object({
  orderNumber: z.string().trim().min(12).max(40).regex(/^XN[A-Z0-9]+$/),
});

export async function POST(request: Request) {
  await assertSameOrigin();
  const ip = await getClientIp();
  const limited = rateLimit(`mp-preference:${ip}`, 20, 60_000);

  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit excedido." }, { status: 429 });
  }

  const parsed = preferenceRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido não informado." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: parsed.data.orderNumber },
    include: { items: true, payments: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  if (order.status !== "PENDING") {
    return NextResponse.json({ error: "Este pedido não está aguardando pagamento." }, { status: 409 });
  }

  const payment = order.payments[0];
  if (!payment) {
    return NextResponse.json({ error: "Pagamento do pedido não encontrado." }, { status: 409 });
  }

  if (payment.checkoutUrl) {
    return NextResponse.json({ preferenceId: payment.preferenceId, checkoutUrl: payment.checkoutUrl });
  }

  const preference = await createMercadoPagoPreference(order);
  const checkoutUrl = getMercadoPagoCheckoutUrl(preference);
  await prisma.payment.update({
    where: { id: payment.id },
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
