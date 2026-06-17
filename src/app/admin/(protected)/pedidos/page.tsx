import Link from "next/link";
import { Search } from "lucide-react";
import { AdminSubmitButton } from "@/components/admin/admin-submit";
import { updateOrderStatus } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate, statusBadgeClass, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statuses = ["PENDING", "PAID", "PREPARING", "AWAITING_PICKUP", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"] as const;
type OrderSearchParams = Promise<{ status?: string; q?: string }>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: OrderSearchParams }) {
  await requireAdmin("orders");
  const params = await searchParams;
  const status = params.status ?? "ALL";
  const q = params.q?.trim();
  const orders = await prisma.order.findMany({
    where: {
      ...(status !== "ALL" ? { status: status as (typeof statuses)[number] } : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { customerName: { contains: q, mode: "insensitive" } },
              { customerEmail: { contains: q, mode: "insensitive" } },
              { customerPhone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { items: true, payments: true, shippingMethod: true, pickupLocation: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 text-white">
        <span className="text-xs font-black uppercase text-white/50">Operacao</span>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">Pedidos</h1>
        <p className="mt-2 text-sm text-white/60">Filtre, acompanhe pagamento, entrega, retirada e altere status.</p>
      </div>

      <form className="surface mb-5 grid gap-3 p-4 md:grid-cols-[1fr_240px_auto]">
        <div className="field flex items-center gap-2">
          <Search size={16} className="text-[var(--muted)]" />
          <input name="q" defaultValue={q} className="w-full bg-transparent outline-none" placeholder="Cliente, email, telefone ou numero" />
        </div>
        <select className="field" name="status" defaultValue={status}>
          <option value="ALL">Todos os status</option>
          {statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
        </select>
        <button className="btn btn-secondary">Filtrar</button>
      </form>

      <div className="grid gap-4">
        {orders.map((order) => (
          <article key={order.id} className="surface overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] p-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/admin/pedidos/${order.id}`} className="text-xl font-black hover:text-[var(--brand)]">{order.orderNumber}</Link>
                  <span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">{order.customerName} · {order.customerEmail} · {formatDate(order.createdAt)}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {order.items.length} item(ns) · {order.shippingType === "PICKUP" ? `Retirada ${order.pickupProtocol ?? ""}` : "Entrega"} · {order.payments[0] ? statusLabel(order.payments[0].status) : "Sem pagamento"}
                </p>
              </div>
              <div className="text-left md:text-right">
                <span className="text-xs font-black uppercase text-[var(--muted)]">Total</span>
                <strong className="mt-1 block text-2xl">{formatCurrency(order.total)}</strong>
              </div>
            </div>

            <div className="grid gap-4 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-3">
                <span><strong className="block text-[var(--ink)]">Pagamento</strong>{order.payments[0]?.method ?? "Aguardando"}</span>
                <span><strong className="block text-[var(--ink)]">Entrega</strong>{order.shippingType === "PICKUP" ? order.pickupLocation?.name ?? "Retirada" : order.shippingMethod?.name ?? "Entrega"}</span>
                <span><strong className="block text-[var(--ink)]">Cliente</strong>{order.customerPhone}</span>
              </div>
              <form action={updateOrderStatus} className="grid gap-2 sm:grid-cols-[220px_1fr_auto]">
                <input type="hidden" name="id" value={order.id} />
                <select className="field" name="status" defaultValue={order.status}>
                  {statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                </select>
                <input className="field" name="notes" placeholder="Observacao interna" defaultValue={order.notes ?? ""} />
                <AdminSubmitButton pendingText="Atualizando...">Atualizar</AdminSubmitButton>
              </form>
            </div>
          </article>
        ))}
        {orders.length === 0 && (
          <div className="surface p-8 text-center text-[var(--muted)]">Nenhum pedido encontrado.</div>
        )}
      </div>
    </div>
  );
}
