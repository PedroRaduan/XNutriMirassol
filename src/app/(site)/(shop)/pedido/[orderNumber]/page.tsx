import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, CreditCard, PackageCheck } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseUnavailable, isDemoModeAllowed } from "@/lib/db/errors";
import { getDemoOrder } from "@/lib/ecommerce/demo-cart";
import { formatCurrency, formatDate, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  let order;
  try {
    order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
        pickupLocation: true,
        shippingMethod: true,
      },
    });
  } catch (error) {
    if (isDatabaseUnavailable(error) && isDemoModeAllowed()) {
      order = await getDemoOrder(orderNumber);
    } else {
      throw error;
    }
  }

  if (!order) notFound();

  const payment = order.payments[0];

  return (
    <div className="container-x py-10">
      <div className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="badge">{statusLabel(order.status)}</span>
            <h1 className="mt-4 text-4xl font-black">Pedido {order.orderNumber}</h1>
            <p className="mt-2 text-[var(--muted)]">Criado em {formatDate(order.createdAt)}</p>
          </div>
          {payment?.checkoutUrl && order.status === "PENDING" && (
            <a href={payment.checkoutUrl} className="btn btn-primary">
              <CreditCard size={18} />
              Pagar no Mercado Pago
            </a>
          )}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-md border border-[var(--line)] p-4">
            <Clock className="text-[var(--brand)]" />
            <h2 className="mt-3 font-black">Status</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Atualização automática por webhook Mercado Pago.</p>
          </div>
          <div className="rounded-md border border-[var(--line)] p-4">
            <PackageCheck className="text-[var(--brand)]" />
            <h2 className="mt-3 font-black">{order.shippingType === "PICKUP" ? "Retirada" : "Entrega"}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {order.shippingType === "PICKUP"
                ? `Protocolo ${order.pickupProtocol}. ${order.pickupLocation?.name ?? ""}`
                : order.shippingMethod?.name}
            </p>
          </div>
          <div className="rounded-md border border-[var(--line)] p-4">
            <CheckCircle2 className="text-[var(--brand)]" />
            <h2 className="mt-3 font-black">Total</h2>
            <p className="mt-1 text-xl font-black">{formatCurrency(order.total)}</p>
          </div>
        </div>

        {order.shippingType === "PICKUP" && order.pickupLocation && (
          <div className="mt-6 rounded-md bg-[#fff1ef] p-4">
            <h2 className="font-black">Instruções para retirada</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{order.pickupLocation.instructions}</p>
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-black">Itens</h2>
          <div className="mt-3 grid gap-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 border-b border-[var(--line)] py-3">
                <div>
                  <strong>{item.productName}</strong>
                  <span className="block text-sm text-[var(--muted)]">{item.quantity}x · SKU {item.sku}</span>
                </div>
                <strong>{formatCurrency(item.total)}</strong>
              </div>
            ))}
          </div>
        </section>

        <Link href="/cliente/pedidos" className="btn btn-secondary mt-6">Ver meus pedidos</Link>
      </div>
    </div>
  );
}
