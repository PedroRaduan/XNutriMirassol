import Link from "next/link";
import { AlertTriangle, ArrowUpRight, DollarSign, Package, ShoppingBag, Store, TicketPercent, Users, type LucideIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getDemoOrders } from "@/lib/ecommerce/demo-cart";
import { fallbackProducts } from "@/lib/fallback/catalog";
import { formatCurrency, statusBadgeClass, statusLabel, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const paidStatuses = ["PAID", "PREPARING", "AWAITING_PICKUP", "SHIPPED", "DELIVERED"] as const;

function StatCard({ label, value, Icon, hint }: { label: string; value: string | number; Icon: LucideIcon; hint?: string }) {
  return (
    <div className="admin-stat rounded-lg p-5 shadow-sm">
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
  const admin = await requireAdmin("dashboard");
  const isDemo = "isDemo" in admin && admin.isDemo;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let orders;
  let productCount;
  let customerCount;
  let lowStockCount;
  let revenue;
  let monthSales;
  let pendingOrders;
  let paidOrders;
  let finance;
  let posFinance;
  let posMonthSales;
  let activeCoupons;
  let topProducts;
  let dailySales;
  let categorySales;

  if (isDemo) {
    const demoOrders = await getDemoOrders();
    orders = demoOrders.slice(0, 8).map((order) => ({
      ...order,
      createdAt: new Date(order.createdAt),
      payments: order.payments,
    }));
    productCount = fallbackProducts.length;
    customerCount = Math.max(1, demoOrders.length);
    lowStockCount = 2;
    const total = demoOrders.reduce((sum, order) => sum + order.total, 0);
    revenue = { _sum: { total } };
    monthSales = demoOrders.length;
    pendingOrders = demoOrders.length;
    paidOrders = 0;
    finance = { _sum: { netProfit: total * 0.28, netRevenue: total * 0.94, productsCost: total * 0.58 } };
    posFinance = { _sum: { total: total * 0.22, netProfit: total * 0.08, costTotal: total * 0.13, feeTotal: total * 0.01 } };
    posMonthSales = 2;
    activeCoupons = 3;
    topProducts = fallbackProducts.slice(0, 5).map((product, index) => ({
      productName: product.name,
      _sum: { quantity: Math.max(1, 8 - index) },
    }));
    dailySales = [
      { label: "Hoje", value: BigInt(Math.max(1, demoOrders.length)) },
      { label: "7 dias", value: BigInt(3) },
      { label: "30 dias", value: BigInt(8) },
    ];
    categorySales = [
      { label: "Suplementos", value: BigInt(12) },
      { label: "Roupas Fitness", value: BigInt(9) },
    ];
  } else {
    const [
      storedOrders,
      storedProductCount,
      storedCustomerCount,
      inventoryItems,
      storedRevenue,
      storedMonthSales,
      storedPendingOrders,
      storedPaidOrders,
      storedFinance,
      storedPOSFinance,
      storedPOSMonthSales,
      storedActiveCoupons,
      storedTopProducts,
      storedDailySales,
      storedCategorySales,
    ] = await Promise.all([
      prisma.order.findMany({ include: { payments: true }, orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.product.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.inventory.findMany({ select: { quantity: true, lowStockThreshold: true } }),
      prisma.order.aggregate({ where: { status: { in: [...paidStatuses] } }, _sum: { total: true } }),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: { in: [...paidStatuses] } } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: { in: [...paidStatuses] } } }),
      prisma.order.aggregate({
        where: { status: { in: [...paidStatuses] } },
        _sum: { netProfit: true, netRevenue: true, productsCost: true },
      }),
      prisma.pOSSale.aggregate({
        where: { status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] } },
        _sum: { total: true, netProfit: true, costTotal: true, feeTotal: true },
      }),
      prisma.pOSSale.count({
        where: { createdAt: { gte: startOfMonth }, status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] } },
      }),
      prisma.coupon.count({ where: { active: true } }),
      prisma.orderItem.groupBy({ by: ["productName"], _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
      prisma.$queryRaw<Array<{ label: string; value: bigint }>>`
        SELECT to_char("createdAt", 'DD/MM') AS label, count(*)::bigint AS value
        FROM "orders"
        WHERE "createdAt" >= NOW() - INTERVAL '14 days'
        GROUP BY label
        ORDER BY min("createdAt") ASC
      `,
      prisma.$queryRaw<Array<{ label: string; value: bigint }>>`
        SELECT c.name AS label, COALESCE(sum(oi.quantity), 0)::bigint AS value
        FROM "order_items" oi
        JOIN "products" p ON p.id = oi."productId"
        JOIN "categories" c ON c.id = p."categoryId"
        GROUP BY c.name
        ORDER BY value DESC
        LIMIT 5
      `,
    ]);

    orders = storedOrders;
    productCount = storedProductCount;
    customerCount = storedCustomerCount;
    lowStockCount = inventoryItems.filter((item) => item.quantity <= item.lowStockThreshold).length;
    revenue = storedRevenue;
    monthSales = storedMonthSales;
    pendingOrders = storedPendingOrders;
    paidOrders = storedPaidOrders;
    finance = storedFinance;
    posFinance = storedPOSFinance;
    posMonthSales = storedPOSMonthSales;
    activeCoupons = storedActiveCoupons;
    topProducts = storedTopProducts;
    dailySales = storedDailySales;
    categorySales = storedCategorySales;
  }

  const onlineRevenue = toNumber(revenue._sum.total ?? 0);
  const posRevenue = toNumber(posFinance._sum.total ?? 0);
  const onlineNetRevenue = toNumber(finance._sum.netRevenue ?? 0);
  const posNetRevenue = Math.max(posRevenue - toNumber(posFinance._sum.feeTotal ?? 0), 0);
  const stats = [
    { label: "Faturamento total", value: formatCurrency(onlineRevenue + posRevenue), Icon: DollarSign, hint: "Online + PDV presencial" },
    { label: "Lucro estimado", value: formatCurrency(toNumber(finance._sum.netProfit ?? 0) + toNumber(posFinance._sum.netProfit ?? 0)), Icon: DollarSign, hint: "Análise gerencial, não contábil" },
    { label: "Receita líquida", value: formatCurrency(onlineNetRevenue + posNetRevenue), Icon: DollarSign, hint: "Online + PDV após taxas principais" },
    { label: "Custo vendido", value: formatCurrency(toNumber(finance._sum.productsCost ?? 0) + toNumber(posFinance._sum.costTotal ?? 0)), Icon: Package, hint: "Custo dos produtos vendidos" },
    { label: "Vendas do mês", value: monthSales + posMonthSales, Icon: ShoppingBag, hint: "Pedidos online + vendas PDV" },
    { label: "Vendas PDV", value: posMonthSales, Icon: Store, hint: "Presenciais no mês" },
    { label: "Pedidos para olhar", value: pendingOrders, Icon: AlertTriangle, hint: "Ainda aguardam pagamento ou atualização" },
    { label: "Pedidos pagos", value: paidOrders, Icon: DollarSign, hint: "Prontos para separar ou acompanhar" },
    { label: "Estoque baixo", value: lowStockCount, Icon: Package, hint: "Itens que merecem reposicao" },
    { label: "Clientes", value: customerCount, Icon: Users, hint: "Contas de clientes" },
    { label: "Produtos", value: productCount, Icon: Package, hint: "Ativos e rascunhos" },
    { label: "Cupons ativos", value: activeCoupons, Icon: TicketPercent, hint: "Disponíveis para checkout" },
  ];
  const quickActions = [
    {
      href: "/pdv",
      title: "Abrir PDV",
      text: "Venda presencial, receba no caixa e baixe estoque automaticamente.",
      Icon: Store,
    },
    {
      href: "/admin/produtos",
      title: "Cadastrar produto",
      text: "Adicione suplementos ou moda fitness com preço, imagem e estoque.",
      Icon: Package,
    },
    {
      href: "/admin/pedidos",
      title: "Ver pedidos",
      text: "Confira quem comprou, pagamento, entrega e retirada.",
      Icon: ShoppingBag,
    },
    {
      href: "/admin/estoque",
      title: "Ajustar estoque",
      text: "Atualize saldos sem precisar mexer direto no banco.",
      Icon: AlertTriangle,
    },
    {
      href: "/admin/financeiro",
      title: "Ver análise financeira",
      text: "Acompanhe lucro, margem, taxas, custos e alertas de precificação.",
      Icon: DollarSign,
    },
    {
      href: "/admin/cupons",
      title: "Criar desconto",
      text: "Monte cupons para campanhas, boas-vindas e ofertas.",
      Icon: TicketPercent,
    },
  ];

  return (
    <div>
      <div className="admin-page-heading mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="admin-eyebrow">Admin XNutri</span>
          <h1 className="mt-3 text-3xl font-black md:text-4xl">Painel da loja</h1>
          <p className="admin-page-copy mt-2 max-w-2xl text-sm leading-6">
            Um resumo simples para acompanhar vendas, pedidos, clientes, produtos, cupons e estoque.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={isDemo ? "/admin?demo=1" : "/admin/financeiro"} className="btn btn-secondary">
            Ver análise financeira <ArrowUpRight size={17} />
          </Link>
          <Link href={isDemo ? "/admin?demo=1" : "/admin/produtos"} className="btn btn-primary">
            Novo produto <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className="admin-help-card mt-6 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-xs font-black uppercase text-[var(--brand-dark)]">Comece por aqui</span>
            <h2 className="mt-2 text-2xl font-black text-[var(--ink)]">Atalhos para as tarefas do dia</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Se você não souber por onde começar, escolha uma dessas ações. Elas cobrem o trabalho mais comum da loja.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ href, title, text, Icon }) => (
            <Link key={href} href={isDemo ? "/admin?demo=1" : href} className="admin-action-card group p-4">
              <Icon size={20} className="text-[var(--brand)]" />
              <strong className="mt-3 block text-[var(--ink)]">{title}</strong>
              <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                {isDemo ? "Disponível quando o PostgreSQL estiver ligado." : text}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] p-5">
            <div>
              <h2 className="text-xl font-black">Pedidos recentes</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Status, cliente, pagamento e total.</p>
            </div>
            <Link href={isDemo ? "/admin?demo=1" : "/admin/pedidos"} className="btn btn-secondary px-3 py-2 text-sm">Gerenciar</Link>
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
                      <Link href={isDemo ? "/admin?demo=1" : `/admin/pedidos/${order.id}`} className="hover:text-[var(--brand)]">{order.orderNumber}</Link>
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
