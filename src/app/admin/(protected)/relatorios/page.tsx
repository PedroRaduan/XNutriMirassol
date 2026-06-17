import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ReportsSearchParams = Promise<{ period?: string; start?: string; end?: string }>;
const paidStatuses = ["PAID", "PREPARING", "AWAITING_PICKUP", "SHIPPED", "DELIVERED"] as const;

function getRange(period = "month", start?: string, end?: string) {
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (period === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "7d") {
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (period === "last-month") {
    from.setMonth(now.getMonth() - 1, 1);
    from.setHours(0, 0, 0, 0);
    to.setMonth(now.getMonth(), 0);
    to.setHours(23, 59, 59, 999);
  } else if (period === "custom" && start && end) {
    from.setTime(new Date(`${start}T00:00:00`).getTime());
    to.setTime(new Date(`${end}T23:59:59`).getTime());
  } else {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="surface p-5">
      <span className="text-sm font-bold text-[var(--muted)]">{label}</span>
      <strong className="mt-2 block text-2xl md:text-3xl">{value}</strong>
      {hint && <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

function Bars({ data }: { data: Array<{ label: string; value: number; suffix?: string }> }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="grid gap-3">
      {data.map((item) => (
        <div key={item.label} className="grid gap-1">
          <div className="flex justify-between gap-3 text-xs font-bold text-[var(--muted)]">
            <span>{item.label}</span>
            <span>{item.value}{item.suffix ?? ""}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#edf0f4]">
            <div className="admin-chart-bar h-full" style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-[var(--muted)]">Sem dados no periodo.</p>}
    </div>
  );
}

export default async function AdminReportsPage({ searchParams }: { searchParams: ReportsSearchParams }) {
  await requireAdmin("reports");
  const params = await searchParams;
  const period = params.period ?? "month";
  const { from, to } = getRange(period, params.start, params.end);

  const orderWhere = {
    createdAt: { gte: from, lte: to },
    status: { in: [...paidStatuses] },
  };

  const [
    paidRevenue,
    orderCount,
    pendingCount,
    topProducts,
    topCategories,
    topCustomers,
    lowStock,
    topCoupons,
    deliveryRows,
    paymentRows,
    dailyRows,
    monthlyRows,
  ] = await Promise.all([
    prisma.order.aggregate({ where: orderWhere, _sum: { total: true } }),
    prisma.order.count({ where: orderWhere }),
    prisma.order.count({ where: { createdAt: { gte: from, lte: to }, status: "PENDING" } }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: orderWhere },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    prisma.$queryRaw<Array<{ label: string; value: bigint }>>`
      SELECT c.name AS label, COALESCE(sum(oi.quantity), 0)::bigint AS value
      FROM "order_items" oi
      JOIN "orders" o ON o.id = oi."orderId"
      JOIN "products" p ON p.id = oi."productId"
      JOIN "categories" c ON c.id = p."categoryId"
      WHERE o."createdAt" >= ${from} AND o."createdAt" <= ${to}
        AND o.status::text IN ('PAID','PREPARING','AWAITING_PICKUP','SHIPPED','DELIVERED')
      GROUP BY c.name
      ORDER BY value DESC
      LIMIT 10
    `,
    prisma.order.groupBy({
      by: ["customerEmail", "customerName"],
      where: orderWhere,
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: "desc" } },
      take: 10,
    }),
    prisma.inventory.findMany({
      where: { quantity: { lte: 5 } },
      include: { product: true, variant: true },
      orderBy: { quantity: "asc" },
      take: 10,
    }),
    prisma.order.groupBy({
      by: ["couponId"],
      where: { createdAt: { gte: from, lte: to }, couponId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.order.groupBy({
      by: ["shippingType"],
      where: { createdAt: { gte: from, lte: to } },
      _count: { id: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { order: { createdAt: { gte: from, lte: to } } },
      _count: { id: true },
    }),
    prisma.$queryRaw<Array<{ label: string; value: bigint }>>`
      SELECT to_char("createdAt", 'DD/MM') AS label, count(*)::bigint AS value
      FROM "orders"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY label
      ORDER BY min("createdAt") ASC
    `,
    prisma.$queryRaw<Array<{ label: string; value: bigint }>>`
      SELECT to_char("createdAt", 'MM/YYYY') AS label, count(*)::bigint AS value
      FROM "orders"
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY label
      ORDER BY min("createdAt") ASC
    `,
  ]);

  const couponIds = topCoupons.map((item) => item.couponId).filter(Boolean) as string[];
  const couponCodes = couponIds.length
    ? await prisma.coupon.findMany({ where: { id: { in: couponIds } }, select: { id: true, code: true } })
    : [];
  const couponCodeById = new Map(couponCodes.map((coupon) => [coupon.id, coupon.code]));
  const revenue = Number(paidRevenue._sum.total ?? 0);
  const averageTicket = orderCount > 0 ? revenue / orderCount : 0;

  return (
    <div>
      <div className="mb-6 text-white">
        <span className="text-xs font-black uppercase text-white/50">Inteligencia</span>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">Relatorios</h1>
        <p className="mt-2 text-sm text-white/60">
          Faturamento, pedidos, ticket medio, produtos, categorias, clientes, cupons, entrega e pagamento.
        </p>
      </div>

      <form className="surface mb-5 grid gap-3 p-4 md:grid-cols-[220px_1fr_1fr_auto]">
        <select className="field" name="period" defaultValue={period}>
          <option value="today">Hoje</option>
          <option value="7d">Ultimos 7 dias</option>
          <option value="month">Mes atual</option>
          <option value="last-month">Mes passado</option>
          <option value="custom">Personalizado</option>
        </select>
        <input className="field" name="start" type="date" defaultValue={params.start ?? from.toISOString().slice(0, 10)} />
        <input className="field" name="end" type="date" defaultValue={params.end ?? to.toISOString().slice(0, 10)} />
        <button className="btn btn-secondary">Aplicar</button>
      </form>

      <div className="mb-5 text-sm font-bold text-white/70">
        Periodo analisado: {formatDate(from)} ate {formatDate(to)}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Faturamento" value={formatCurrency(revenue)} hint="Pedidos pagos no periodo" />
        <Metric label="Pedidos pagos" value={orderCount} hint="Confirmados e em andamento" />
        <Metric label="Ticket medio" value={formatCurrency(averageTicket)} hint="Faturamento dividido por pedidos" />
        <Metric label="Pedidos pendentes" value={pendingCount} hint="Ainda sem pagamento confirmado" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="surface p-5">
          <h2 className="text-xl font-black">Vendas por dia</h2>
          <div className="mt-4"><Bars data={dailyRows.map((item) => ({ label: item.label, value: Number(item.value) }))} /></div>
        </section>
        <section className="surface p-5">
          <h2 className="text-xl font-black">Vendas por mes</h2>
          <div className="mt-4"><Bars data={monthlyRows.map((item) => ({ label: item.label, value: Number(item.value) }))} /></div>
        </section>
        <section className="surface p-5">
          <h2 className="text-xl font-black">Produtos mais vendidos</h2>
          <div className="mt-4 grid gap-2">
            {topProducts.map((item) => (
              <div key={item.productName} className="flex justify-between gap-4 border-b border-[var(--line)] py-2 text-sm">
                <span>{item.productName}</span>
                <strong>{item._sum.quantity ?? 0} · {formatCurrency(item._sum.total ?? 0)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="surface p-5">
          <h2 className="text-xl font-black">Categorias mais vendidas</h2>
          <div className="mt-4"><Bars data={topCategories.map((item) => ({ label: item.label, value: Number(item.value) }))} /></div>
        </section>
        <section className="surface p-5">
          <h2 className="text-xl font-black">Clientes que mais compraram</h2>
          <div className="mt-4 grid gap-2">
            {topCustomers.map((item) => (
              <div key={item.customerEmail} className="flex justify-between gap-4 border-b border-[var(--line)] py-2 text-sm">
                <span>{item.customerName}</span>
                <strong>{item._count.id} pedidos · {formatCurrency(item._sum.total ?? 0)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="surface p-5">
          <h2 className="text-xl font-black">Estoque baixo</h2>
          <div className="mt-4 grid gap-2">
            {lowStock.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 border-b border-[var(--line)] py-2 text-sm">
                <span>{item.product.name} · {item.variant?.name ?? "Produto"}</span>
                <strong>{item.quantity}</strong>
              </div>
            ))}
            {lowStock.length === 0 && <p className="text-sm text-[var(--muted)]">Nenhum item em estoque baixo.</p>}
          </div>
        </section>
        <section className="surface p-5">
          <h2 className="text-xl font-black">Cupons mais usados</h2>
          <div className="mt-4"><Bars data={topCoupons.map((item) => ({ label: couponCodeById.get(item.couponId ?? "") ?? "Cupom removido", value: item._count.id }))} /></div>
        </section>
        <section className="surface p-5">
          <h2 className="text-xl font-black">Entrega e pagamento</h2>
          <div className="mt-4 grid gap-5">
            <Bars data={deliveryRows.map((item) => ({ label: item.shippingType === "PICKUP" ? "Retirada" : "Entrega", value: item._count.id }))} />
            <Bars data={paymentRows.map((item) => ({ label: item.method, value: item._count.id }))} />
          </div>
        </section>
      </div>
    </div>
  );
}
