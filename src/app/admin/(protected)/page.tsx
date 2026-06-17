import Link from "next/link";
import { AlertTriangle, ArrowUpRight, DollarSign, Package, ShoppingBag, TicketPercent, Users, type LucideIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, statusBadgeClass, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

const paidStatuses = ["PAID", "PREPARING", "AWAITING_PICKUP", "SHIPPED", "DELIVERED"] as const;

function StatCard({ label, value, Icon, hint }: { label: string; value: string | number; Icon: LucideIcon; hint?: string }) {
  return (
    <div className="admin-stat rounded-lg p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-sm font-bold text-[var(--muted)]">{label}</span>
          <strong className="mt-2 block text-2xl text-[var(--ink)] md:text-3xl">{value}</strong>
          {hint && <span className="mt-1 block text-xs font-semibold text-[var(--muted)]">{hint}</span>}
        </div>
        <Icon className="text-[var(--brand)]" size={24} />
      </div>
    </div>
  );
}

function MiniBars({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="grid gap-3">
      {data.map((item) => (
        <div key={item.label} className="grid gap-1">
          <div className="flex justify-between gap-3 text-xs font-bold text-[var(--muted)]">
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#edf0f4]">
            <div className="admin-chart-bar h-full" style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin("dashboard");
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({ include: { payments: true }, orderBy: { createdAt: "desc" }, take: 8 });
  const productCount = await prisma.product.count({ where: { status: { not: "ARCHIVED" } } });
  const customerCount = await prisma.user.count({ where: { role: "CLIENT" } });
  const inventoryItems = await prisma.inventory.findMany({ select: { quantity: true, lowStockThreshold: true } });
  const lowStockCount = inventoryItems.filter((item) => item.quantity <= item.lowStockThreshold).length;
  const revenue = await prisma.order.aggregate({ where: { status: { in: [...paidStatuses] } }, _sum: { total: true } });
  const monthSales = await prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: { in: [...paidStatuses] } } });
  const pendingOrders = await prisma.order.count({ where: { status: "PENDING" } });
  const paidOrders = await prisma.order.count({ where: { status: { in: [...paidStatuses] } } });
  const activeCoupons = await prisma.coupon.count({ where: { active: true } });
  const topProducts = await prisma.orderItem.groupBy({ by: ["productName"], _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 });
  const dailySales = await prisma.$queryRaw<Array<{ label: string; value: bigint }>>`
    SELECT to_char("createdAt", 'DD/MM') AS label, count(*)::bigint AS value
    FROM "orders"
    WHERE "createdAt" >= NOW() - INTERVAL '14 days'
    GROUP BY label
    ORDER BY min("createdAt") ASC
  `;
  const categorySales = await prisma.$queryRaw<Array<{ label: string; value: bigint }>>`
    SELECT c.name AS label, COALESCE(sum(oi.quantity), 0)::bigint AS value
    FROM "order_items" oi
    JOIN "products" p ON p.id = oi."productId"
    JOIN "categories" c ON c.id = p."categoryId"
    GROUP BY c.name
    ORDER BY value DESC
    LIMIT 5
  `;

  const stats = [
    { label: "Faturamento total", value: formatCurrency(revenue._sum.total ?? 0), Icon: DollarSign, hint: "Pedidos pagos e em andamento" },
    { label: "Vendas do mes", value: monthSales, Icon: ShoppingBag, hint: "Desde o primeiro dia do mes" },
    { label: "Pedidos pendentes", value: pendingOrders, Icon: AlertTriangle, hint: "Aguardando pagamento ou acao" },
    { label: "Pedidos pagos", value: paidOrders, Icon: DollarSign, hint: "Pagos, preparo, retirada, enviados" },
    { label: "Estoque baixo", value: lowStockCount, Icon: Package, hint: "Abaixo do minimo configurado" },
    { label: "Clientes", value: customerCount, Icon: Users, hint: "Contas de clientes" },
    { label: "Produtos", value: productCount, Icon: Package, hint: "Ativos e rascunhos" },
    { label: "Cupons ativos", value: activeCoupons, Icon: TicketPercent, hint: "Disponiveis para checkout" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 text-white md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-black uppercase text-white/50">Admin XNutri</span>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            Visao operacional de vendas, pedidos, clientes, produtos, cupons e estoque.
          </p>
        </div>
        <Link href="/admin/produtos" className="btn bg-white text-[var(--ink)] hover:bg-[#f2f3f5]">
          Novo produto <ArrowUpRight size={17} />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] p-5">
            <div>
              <h2 className="text-xl font-black">Pedidos recentes</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Status, cliente, pagamento e total.</p>
            </div>
            <Link href="/admin/pedidos" className="btn btn-secondary px-3 py-2 text-sm">Gerenciar</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f7f7f8] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3">Pedido</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Pagamento</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="admin-row border-t border-[var(--line)]">
                    <td className="px-5 py-4 font-black">
                      <Link href={`/admin/pedidos/${order.id}`} className="hover:text-[var(--brand)]">{order.orderNumber}</Link>
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">{order.customerName}</td>
                    <td className="px-5 py-4"><span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span></td>
                    <td className="px-5 py-4">{statusLabel(order.payments[0]?.status ?? "PENDING")}</td>
                    <td className="px-5 py-4 text-right font-black">{formatCurrency(order.total)}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--muted)]" colSpan={5}>Nenhum pedido registrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6">
          <div className="surface p-5">
            <h2 className="text-xl font-black">Vendas por dia</h2>
            <div className="mt-4">
              <MiniBars data={dailySales.map((item) => ({ label: item.label, value: Number(item.value) }))} />
            </div>
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Categorias mais vendidas</h2>
            <div className="mt-4">
              <MiniBars data={categorySales.map((item) => ({ label: item.label, value: Number(item.value) }))} />
            </div>
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Produtos mais vendidos</h2>
            <div className="mt-4 grid gap-2">
              {topProducts.map((item) => (
                <div key={item.productName} className="flex justify-between gap-4 border-b border-[var(--line)] py-2 text-sm">
                  <span className="font-semibold text-[var(--muted)]">{item.productName}</span>
                  <strong>{item._sum.quantity ?? 0}</strong>
                </div>
              ))}
              {topProducts.length === 0 && <p className="text-sm text-[var(--muted)]">Sem vendas registradas.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
