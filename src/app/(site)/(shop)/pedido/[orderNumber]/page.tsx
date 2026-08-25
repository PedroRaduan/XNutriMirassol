import Link from "next/link";
import { notFound } from "next/navigation";
import { PagBankCheckoutButton } from "@/components/payment/pagbank-checkout-button";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseUnavailable, isDemoModeAllowed } from "@/lib/db/errors";
import { getDemoOrder } from "@/lib/ecommerce/demo-cart";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessOrder } from "@/lib/ecommerce/order-access";
import { formatCurrency, formatDate, statusLabel } from "@/lib/utils";
import { isPagBankCheckoutEnabled } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Acompanhar pedido",
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ access?: string }>;
}) {
  const { orderNumber } = await params;
  const { access } = await searchParams;
  let order;
  let isDemoOrder = false;
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
      isDemoOrder = true;
    } else {
      throw error;
    }
  }

  if (!order) notFound();

  const viewer = await getCurrentUser();
  if (!isDemoOrder) {
    const persistedOrder = order as typeof order & { userId: string | null; accessTokenHash: string | null };
    if (!canAccessOrder(persistedOrder, viewer, access)) notFound();
  }

  const payment = order.payments[0];
  const pagBankCheckoutEnabled = isPagBankCheckoutEnabled();

  return (
    <div className="container-x py-10">
      <div className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="badge">{statusLabel(order.status)}</span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Pedido {order.orderNumber}</h1>
            <p className="mt-2 text-[var(--muted)]">Criado em {formatDate(order.createdAt)}</p>
          </div>
          {payment && order.status === "PENDING" && pagBankCheckoutEnabled && (
            <PagBankCheckoutButton orderNumber={order.orderNumber} accessToken={access} checkoutUrl={payment.checkoutUrl} />
          )}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-md border border-[var(--line)] p-4">
            <h2 className="font-bold">Status</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {pagBankCheckoutEnabled ? "Atualização automática por webhook PagBank." : "Pagamento online temporariamente indisponível."}
            </p>
          </div>
          <div className="rounded-md border border-[var(--line)] p-4">
            <h2 className="font-bold">{order.shippingType === "PICKUP" ? "Retirada" : "Entrega"}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {order.shippingType === "PICKUP"
                ? `Protocolo ${order.pickupProtocol}. ${order.pickupLocation?.name ?? ""}`
                : order.shippingMethod?.name}
            </p>
          </div>
          <div className="rounded-md border border-[var(--line)] p-4">
            <h2 className="font-bold">Total</h2>
            <p className="mt-1 text-xl font-bold">{formatCurrency(order.total)}</p>
          </div>
        </div>

        {order.shippingType === "PICKUP" && order.pickupLocation && (
          <div className="mt-6 rounded-md bg-[#fff7f6] p-4">
            <h2 className="font-bold">Instruções para retirada</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{order.pickupLocation.instructions}</p>
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-bold">Itens</h2>
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
