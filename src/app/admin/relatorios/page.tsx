import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const [paidRevenue, pendingRevenue, ordersByStatus, topProducts] = await Promise.all([
    prisma.order.aggregate({ where: { status: { in: ["PAID", "PREPARING", "SHIPPED", "DELIVERED"] } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { status: "PENDING" }, _sum: { total: true }, _count: true }),
    prisma.order.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.orderItem.groupBy({ by: ["productName"], _sum: { quantity: true, total: true }, orderBy: { _sum: { quantity: "desc" } }, take: 10 }),
  ]);

  return (
    <div>
      <h1 className="text-4xl font-black">Relatórios</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="surface p-5"><span className="text-sm text-[var(--muted)]">Receita confirmada</span><strong className="mt-2 block text-3xl">{formatCurrency(paidRevenue._sum.total ?? 0)}</strong><p className="mt-1 text-sm text-[var(--muted)]">{paidRevenue._count} pedido(s)</p></div>
        <div className="surface p-5"><span className="text-sm text-[var(--muted)]">Receita pendente</span><strong className="mt-2 block text-3xl">{formatCurrency(pendingRevenue._sum.total ?? 0)}</strong><p className="mt-1 text-sm text-[var(--muted)]">{pendingRevenue._count} pedido(s)</p></div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="text-xl font-black">Pedidos por status</h2>
          <div className="mt-4 grid gap-2">
            {ordersByStatus.map((item) => (
              <div key={item.status} className="flex justify-between border-b border-[var(--line)] py-2">
                <span>{item.status}</span><strong>{item._count.status}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="surface p-5">
          <h2 className="text-xl font-black">Produtos mais vendidos</h2>
          <div className="mt-4 grid gap-2">
            {topProducts.map((item) => (
              <div key={item.productName} className="flex justify-between gap-3 border-b border-[var(--line)] py-2">
                <span>{item.productName}</span>
                <strong>{item._sum.quantity ?? 0} · {formatCurrency(item._sum.total ?? 0)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
