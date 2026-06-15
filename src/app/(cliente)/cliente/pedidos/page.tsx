import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-4xl font-black">Histórico de pedidos</h1>
      <div className="mt-6 grid gap-4">
        {orders.map((order) => (
          <Link key={order.id} href={`/pedido/${order.orderNumber}`} className="surface p-5 hover:border-[var(--brand)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <strong className="text-xl">{order.orderNumber}</strong>
                <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(order.createdAt)} · {order.items.length} item(ns)</p>
              </div>
              <span className="badge">{statusLabel(order.status)}</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-[var(--line)] pt-4">
              <span className="text-[var(--muted)]">{order.shippingType === "PICKUP" ? "Retirada na loja" : "Entrega"}</span>
              <strong>{formatCurrency(order.total)}</strong>
            </div>
          </Link>
        ))}
        {orders.length === 0 && <div className="surface p-6 text-[var(--muted)]">Você ainda não tem pedidos.</div>}
      </div>
    </div>
  );
}
