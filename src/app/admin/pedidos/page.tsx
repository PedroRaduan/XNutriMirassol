import { updateOrderStatus } from "@/lib/actions/admin";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statuses = ["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELED"];

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({ include: { items: true, payments: true }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-4xl font-black">Pedidos</h1>
      <div className="mt-6 grid gap-4">
        {orders.map((order) => (
          <article key={order.id} className="surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <strong className="text-xl">{order.orderNumber}</strong>
                <p className="mt-1 text-sm text-[var(--muted)]">{order.customerName} · {order.customerEmail} · {formatDate(order.createdAt)}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{order.items.length} item(ns) · {order.shippingType === "PICKUP" ? `Retirada ${order.pickupProtocol}` : "Entrega"}</p>
              </div>
              <div className="text-right">
                <span className="badge">{statusLabel(order.status)}</span>
                <strong className="mt-2 block">{formatCurrency(order.total)}</strong>
              </div>
            </div>
            <form action={updateOrderStatus} className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
              <input type="hidden" name="id" value={order.id} />
              <select className="field max-w-56" name="status" defaultValue={order.status}>
                {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
              <button className="btn btn-primary">Atualizar status</button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
