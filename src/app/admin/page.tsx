import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [orders, products, customers, lowStock, revenue] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.product.count(),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.inventory.count({ where: { quantity: { lte: 5 } } }),
    prisma.order.aggregate({ where: { status: { in: ["PAID", "PREPARING", "SHIPPED", "DELIVERED"] } }, _sum: { total: true } }),
  ]);

  return (
    <div>
      <h1 className="text-4xl font-black">Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="surface p-5"><span className="text-sm text-[var(--muted)]">Receita paga</span><strong className="mt-2 block text-2xl">{formatCurrency(revenue._sum.total ?? 0)}</strong></div>
        <div className="surface p-5"><span className="text-sm text-[var(--muted)]">Produtos</span><strong className="mt-2 block text-2xl">{products}</strong></div>
        <div className="surface p-5"><span className="text-sm text-[var(--muted)]">Clientes</span><strong className="mt-2 block text-2xl">{customers}</strong></div>
        <div className="surface p-5"><span className="text-sm text-[var(--muted)]">Estoque baixo</span><strong className="mt-2 block text-2xl">{lowStock}</strong></div>
      </div>
      <section className="surface mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Pedidos recentes</h2>
          <Link href="/admin/pedidos" className="text-sm font-black text-[var(--brand)]">Gerenciar</Link>
        </div>
        <div className="mt-4 grid gap-3">
          {orders.map((order) => (
            <Link key={order.id} href="/admin/pedidos" className="flex flex-wrap justify-between gap-3 border-b border-[var(--line)] py-3">
              <span><strong>{order.orderNumber}</strong><span className="block text-sm text-[var(--muted)]">{order.customerName}</span></span>
              <span className="badge">{statusLabel(order.status)}</span>
              <strong>{formatCurrency(order.total)}</strong>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
