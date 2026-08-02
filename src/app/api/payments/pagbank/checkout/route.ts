import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { createPagBankCheckout } from "@/lib/payments/pagbank";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessOrder } from "@/lib/ecommerce/order-access";
import { assertSameOrigin, getClientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";

const checkoutRequestSchema = z.object({
  orderNumber: z.string().trim().min(12).max(40).regex(/^XN[A-Z0-9]+$/),
  accessToken: z.string().trim().min(32).max(128).optional(),
});

export async function POST(request: Request) {
  await assertSameOrigin();
  const ip = await getClientIp();
  if (!rateLimit(`pagbank-checkout:${ip}`, 12, 60_000).ok) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns instantes." }, { status: 429 });
  }

  const parsed = checkoutRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pedido não informado." }, { status: 400 });

  const [viewer, order] = await Promise.all([getCurrentUser(), prisma.order.findUnique({
    where: { orderNumber: parsed.data.orderNumber },
    include: { items: true, payments: true },
  })]);
  if (!order || !canAccessOrder(order, viewer, parsed.data.accessToken)) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  if (order.status !== "PENDING") return NextResponse.json({ error: "Este pedido não está aguardando pagamento." }, { status: 409 });

  const payment = order.payments.find((item) => item.provider === "PAGBANK") ?? order.payments[0];
  if (!payment) return NextResponse.json({ error: "Pagamento do pedido não encontrado." }, { status: 409 });
  if (payment.checkoutUrl) return NextResponse.json({ checkoutId: payment.preferenceId, checkoutUrl: payment.checkoutUrl });

  try {
    if (!parsed.data.accessToken) {
      return NextResponse.json({ error: "Link de pagamento inválido. Abra o pedido novamente." }, { status: 403 });
    }
    const checkout = await createPagBankCheckout(order, parsed.data.accessToken);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { provider: "PAGBANK", preferenceId: checkout.checkoutId, checkoutUrl: checkout.checkoutUrl },
    });
    return NextResponse.json(checkout);
  } catch (error) {
    console.error("Falha ao criar checkout PagBank", { orderId: order.id, message: error instanceof Error ? error.message : "erro desconhecido" });
    return NextResponse.json({ error: "Não foi possível abrir o pagamento agora. Tente novamente em instantes." }, { status: 502 });
  }
}
