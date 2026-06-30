import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CircleDollarSign, Percent, ReceiptText, TrendingUp } from "lucide-react";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateUnitFinance, marginPercent, roundMoney } from "@/lib/finance/calculations";
import { getFinancialSettings } from "@/lib/finance/settings";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type FinancialSearchParams = Promise<{ period?: string; start?: string; end?: string }>;

const paidStatuses = ["PAID", "PREPARING", "AWAITING_PICKUP", "SHIPPED", "DELIVERED"] as const;

function getRange(period = "30d", start?: string, end?: string) {
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (period === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "7d") {
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else if (period === "last-month") {
    from.setMonth(now.getMonth() - 1, 1);
    from.setHours(0, 0, 0, 0);
    to.setMonth(now.getMonth(), 0);
    to.setHours(23, 59, 59, 999);
  } else if (period === "year") {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  } else if (period === "custom" && start && end) {
    from.setTime(new Date(`${start}T00:00:00`).getTime());
    to.setTime(new Date(`${end}T23:59:59`).getTime());
  } else {
    from.setDate(now.getDate() - 29);
    from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}

function orderGrossRevenue(order: { grossRevenue: unknown; subtotal: unknown; shippingCost: unknown }) {
  const saved = toNumber(order.grossRevenue);
  return saved > 0 ? saved : toNumber(order.subtotal) + toNumber(order.shippingCost);
}

function orderNetRevenue(order: { netRevenue: unknown; total: unknown; paymentFee: unknown; fixedFee: unknown }) {
  const saved = toNumber(order.netRevenue);
  return saved > 0 ? saved : Math.max(toNumber(order.total) - toNumber(order.paymentFee) - toNumber(order.fixedFee), 0);
}

function orderNetProfit(order: { netProfit: unknown; grossProfit: unknown; packagingCost: unknown; paymentFee: unknown; fixedFee: unknown; estimatedTax: unknown; shippingCostPaidByStore: unknown }) {
  const saved = toNumber(order.netProfit);
  if (saved !== 0) return saved;
  return roundMoney(
    toNumber(order.grossProfit) -
      toNumber(order.packagingCost) -
      toNumber(order.paymentFee) -
      toNumber(order.fixedFee) -
      toNumber(order.estimatedTax) -
      toNumber(order.shippingCostPaidByStore),
  );
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="admin-stat rounded-lg p-5 shadow-sm">
      <span className="text-sm font-bold text-[var(--muted)]">{label}</span>
      <strong className="mt-2 block text-2xl text-[var(--ink)] md:text-3xl">{value}</strong>
      {hint && <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

function Bars({ data, money = false }: { data: Array<{ label: string; value: number }>; money?: boolean }) {
  const max = Math.max(...data.map((item) => Math.abs(item.value)), 1);

  return (
    <div className="grid gap-3">
      {data.map((item) => (
        <div key={item.label} className="grid gap-1">
          <div className="flex justify-between gap-3 text-xs font-bold text-[var(--muted)]">
            <span className="truncate">{item.label}</span>
            <span>{money ? formatCurrency(item.value) : item.value.toLocaleString("pt-BR")}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#edf0f4]">
            <div className="admin-chart-bar h-full" style={{ width: `${Math.max(6, (Math.abs(item.value) / max) * 100)}%` }} />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-[var(--muted)]">Sem dados no período.</p>}
    </div>
  );
}

function ComparisonBars({ data }: { data: Array<{ label: string; gross: number; profit: number }> }) {
  const max = Math.max(...data.flatMap((item) => [item.gross, Math.abs(item.profit)]), 1);

  return (
    <div className="grid gap-4">
      {data.map((item) => (
        <div key={item.label} className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--muted)]">
            <span>{item.label}</span>
            <span>{formatCurrency(item.gross)} / {formatCurrency(item.profit)}</span>
          </div>
          <div className="grid gap-1">
            <div className="h-3 overflow-hidden rounded-full bg-[#edf0f4]">
              <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.max(5, (item.gross / max) * 100)}%` }} />
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#edf0f4]">
              <div className="h-full rounded-full bg-[#111827]" style={{ width: `${Math.max(5, (Math.abs(item.profit) / max) * 100)}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AdminFinancialPage({ searchParams }: { searchParams: FinancialSearchParams }) {
  await requireAdmin("finance");
  const params = await searchParams;
  const period = params.period ?? "30d";
  const { from, to } = getRange(period, params.start, params.end);
  const settings = await getFinancialSettings();
  const orderWhere = {
    createdAt: { gte: from, lte: to },
    status: { in: [...paidStatuses] },
  };

  const [orders, productRows, productSalesRows, products] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      include: { items: true, coupon: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: orderWhere },
      _sum: { quantity: true, total: true, productCost: true, netProfit: true, grossProfit: true },
      orderBy: { _sum: { netProfit: "desc" } },
      take: 12,
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: orderWhere },
      _sum: { quantity: true, total: true, netProfit: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 12,
    }),
    prisma.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: { variants: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const grossRevenue = roundMoney(orders.reduce((sum, order) => sum + orderGrossRevenue(order), 0));
  const netRevenue = roundMoney(orders.reduce((sum, order) => sum + orderNetRevenue(order), 0));
  const productsCost = roundMoney(orders.reduce((sum, order) => sum + toNumber(order.productsCost), 0));
  const grossProfit = roundMoney(orders.reduce((sum, order) => sum + toNumber(order.grossProfit), 0));
  const netProfit = roundMoney(orders.reduce((sum, order) => sum + orderNetProfit(order), 0));
  const totalDiscounts = roundMoney(orders.reduce((sum, order) => sum + toNumber(order.discount), 0));
  const totalFees = roundMoney(orders.reduce((sum, order) => sum + toNumber(order.paymentFee) + toNumber(order.fixedFee), 0));
  const averageTicket = orders.length > 0 ? grossRevenue / orders.length : 0;
  const averageMargin = marginPercent(netProfit, netRevenue);

  const dailyMap = new Map<string, { gross: number; profit: number; netRevenue: number; cost: number; discount: number; fees: number }>();
  for (const order of orders) {
    const label = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(order.createdAt);
    const current = dailyMap.get(label) ?? { gross: 0, profit: 0, netRevenue: 0, cost: 0, discount: 0, fees: 0 };
    current.gross += orderGrossRevenue(order);
    current.profit += orderNetProfit(order);
    current.netRevenue += orderNetRevenue(order);
    current.cost += toNumber(order.productsCost);
    current.discount += toNumber(order.discount);
    current.fees += toNumber(order.paymentFee) + toNumber(order.fixedFee);
    dailyMap.set(label, current);
  }
  const dailyRows = Array.from(dailyMap.entries()).map(([label, values]) => ({
    label,
    gross: roundMoney(values.gross),
    profit: roundMoney(values.profit),
    netRevenue: roundMoney(values.netRevenue),
    cost: roundMoney(values.cost),
    discount: roundMoney(values.discount),
    fees: roundMoney(values.fees),
  }));

  const productProfitRows = productRows.map((item) => ({
    label: item.productName,
    value: roundMoney(toNumber(item._sum.netProfit ?? 0)),
    margin: marginPercent(toNumber(item._sum.netProfit ?? 0), toNumber(item._sum.total ?? 0)),
    quantity: item._sum.quantity ?? 0,
  }));
  const productMarginRows = productRows
    .map((item) => ({
      label: item.productName,
      value: marginPercent(toNumber(item._sum.netProfit ?? 0), toNumber(item._sum.total ?? 0)),
      profit: roundMoney(toNumber(item._sum.netProfit ?? 0)),
    }))
    .sort((a, b) => a.value - b.value);

  const productAlerts = products.flatMap((product) => {
    const rows: Array<{ type: string; text: string }> = [];
    const productCost = toNumber(product.costPrice ?? 0);
    if (productCost <= 0) {
      rows.push({ type: "Custo não cadastrado", text: `${product.name} está sem custo do produto.` });
    }
    const finance = calculateUnitFinance({
      price: toNumber(product.price),
      costPrice: productCost,
      packagingCost: toNumber(product.packagingCost ?? settings.defaultPackagingCost),
      taxRate: toNumber(product.estimatedTaxRate ?? settings.estimatedTaxRate),
    });
    if (productCost > 0 && finance.margin < settings.lowMarginAlert) {
      rows.push({ type: "Margem baixa", text: `${product.name} está com margem estimada de ${finance.margin.toFixed(2)}%.` });
    }
    if (productCost > 0 && finance.netProfit < 0) {
      rows.push({ type: "Prejuízo", text: `${product.name} tem lucro estimado negativo por unidade.` });
    }
    for (const variant of product.variants) {
      if (variant.costPrice === null) {
        rows.push({ type: "Custo de variação", text: `${product.name} / ${variant.name} está sem custo específico.` });
      }
    }
    return rows;
  });
  const lowProfitOrders = orders
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      profit: orderNetProfit(order),
      margin: marginPercent(orderNetProfit(order), orderNetRevenue(order)),
      coupon: order.coupon?.code,
      discount: toNumber(order.discount),
    }))
    .filter((order) => order.profit < 0 || order.margin < settings.lowMarginAlert || (order.discount > 0 && order.margin < settings.minimumMargin))
    .slice(0, 8);
  const bestOrders = orders
    .map((order) => ({ id: order.id, orderNumber: order.orderNumber, profit: orderNetProfit(order), margin: marginPercent(orderNetProfit(order), orderNetRevenue(order)) }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  return (
    <div>
      <div className="admin-page-heading mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="admin-eyebrow">Lucro gerencial</span>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">Análise financeira</h1>
          <p className="admin-page-copy mt-2 max-w-3xl text-sm">
            Veja quanto a loja vendeu e quanto provavelmente lucrou, usando custos, taxas, descontos, frete pago pela loja, embalagem e impostos estimados.
          </p>
        </div>
        <Link href="/admin/produtos" className="btn btn-secondary">
          Revisar custos <ArrowUpRight size={17} />
        </Link>
      </div>

      <form className="surface mb-5 grid gap-3 p-4 md:grid-cols-[220px_1fr_1fr_auto]">
        <select className="field" name="period" defaultValue={period}>
          <option value="today">Hoje</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="month">Mês atual</option>
          <option value="last-month">Mês passado</option>
          <option value="year">Ano atual</option>
          <option value="custom">Personalizado</option>
        </select>
        <input className="field" name="start" type="date" defaultValue={params.start ?? from.toISOString().slice(0, 10)} />
        <input className="field" name="end" type="date" defaultValue={params.end ?? to.toISOString().slice(0, 10)} />
        <button className="btn btn-secondary">Aplicar</button>
      </form>

      <div className="mb-5 rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm font-bold text-[var(--muted)]">
        Período analisado: {formatDate(from)} até {formatDate(to)}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Faturamento bruto" value={formatCurrency(grossRevenue)} hint="Total vendido antes de descontos, custos e taxas." />
        <Metric label="Receita líquida" value={formatCurrency(netRevenue)} hint="Valor depois de descontos e taxas principais." />
        <Metric label="Custo dos produtos vendidos" value={formatCurrency(productsCost)} hint="Quanto a loja pagou pelos produtos vendidos." />
        <Metric label="Lucro líquido estimado" value={formatCurrency(netProfit)} hint="Venda menos custos, taxas, frete, embalagem e imposto estimado." />
        <Metric label="Lucro bruto" value={formatCurrency(grossProfit)} hint="Venda menos custo do produto." />
        <Metric label="Margem média" value={`${averageMargin.toFixed(2)}%`} hint="Percentual de lucro sobre a receita." />
        <Metric label="Ticket médio" value={formatCurrency(averageTicket)} hint="Faturamento dividido por pedidos pagos." />
        <Metric label="Descontos e taxas" value={formatCurrency(totalDiscounts + totalFees)} hint={`${formatCurrency(totalDiscounts)} em descontos e ${formatCurrency(totalFees)} em taxas.`} />
      </div>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-[var(--brand)]" />
            <h2 className="text-xl font-black">Faturamento x lucro por período</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">Vermelho: faturamento bruto. Grafite: lucro líquido estimado.</p>
          <div className="mt-5">
            <ComparisonBars data={dailyRows.map((item) => ({ label: item.label, gross: item.gross, profit: item.profit }))} />
          </div>
        </div>

        <AdminActionForm actionName="updateFinancialSettings" className="surface grid gap-3 p-5">
          <div className="flex items-center gap-2">
            <CircleDollarSign size={20} className="text-[var(--brand)]" />
            <h2 className="text-xl font-black">Configurações financeiras</h2>
          </div>
          <label className="text-sm font-black">Taxa Mercado Pago %<input className="field mt-2" name="mercadoPagoRate" type="number" step="0.01" min={0} defaultValue={settings.mercadoPagoRate} /></label>
          <label className="text-sm font-black">Taxa fixa por pedido<input className="field mt-2" name="fixedTransactionFee" type="number" step="0.01" min={0} defaultValue={settings.fixedTransactionFee} /></label>
          <div className="rounded-lg border border-[#ffd8d1] bg-[#fff8f7] p-3">
            <h3 className="text-sm font-black text-[var(--brand-dark)]">Taxas do PDV por forma de pagamento</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-black">Dinheiro %<input className="field mt-2" name="posCashRate" type="number" step="0.01" min={0} defaultValue={settings.posCashRate} /></label>
              <label className="text-sm font-black">Pix %<input className="field mt-2" name="posPixRate" type="number" step="0.01" min={0} defaultValue={settings.posPixRate} /></label>
              <label className="text-sm font-black">Débito %<input className="field mt-2" name="posDebitRate" type="number" step="0.01" min={0} defaultValue={settings.posDebitRate} /></label>
              <label className="text-sm font-black">Crédito %<input className="field mt-2" name="posCreditRate" type="number" step="0.01" min={0} defaultValue={settings.posCreditRate} /></label>
              <label className="text-sm font-black sm:col-span-2">Mercado Pago PDV %<input className="field mt-2" name="posMercadoPagoRate" type="number" step="0.01" min={0} defaultValue={settings.posMercadoPagoRate} /></label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm font-bold">
              <input className="accent-[var(--brand)]" name="allowNegativeStock" type="checkbox" defaultChecked={settings.allowNegativeStock} />
              Permitir venda com estoque negativo no PDV
            </label>
          </div>
          <label className="text-sm font-black">Imposto estimado %<input className="field mt-2" name="estimatedTaxRate" type="number" step="0.01" min={0} defaultValue={settings.estimatedTaxRate} /></label>
          <label className="text-sm font-black">Embalagem padrão<input className="field mt-2" name="defaultPackagingCost" type="number" step="0.01" min={0} defaultValue={settings.defaultPackagingCost} /></label>
          <label className="text-sm font-black">Margem mínima desejada %<input className="field mt-2" name="minimumMargin" type="number" step="0.01" min={0} defaultValue={settings.minimumMargin} /></label>
          <label className="text-sm font-black">Alerta de margem baixa %<input className="field mt-2" name="lowMarginAlert" type="number" step="0.01" min={0} defaultValue={settings.lowMarginAlert} /></label>
          <label className="text-sm font-black">Frete pago pela loja<input className="field mt-2" name="defaultShippingCostPaidByStore" type="number" step="0.01" min={0} defaultValue={settings.defaultShippingCostPaidByStore} /></label>
          <AdminSubmitButton pendingText="Salvando financeiro...">Salvar financeiro</AdminSubmitButton>
        </AdminActionForm>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-4">
        <div className="surface p-5">
          <h2 className="text-xl font-black">Receita líquida por período</h2>
          <div className="mt-4"><Bars money data={dailyRows.map((item) => ({ label: item.label, value: item.netRevenue }))} /></div>
        </div>
        <div className="surface p-5">
          <h2 className="text-xl font-black">Custo dos produtos vendidos</h2>
          <div className="mt-4"><Bars money data={dailyRows.map((item) => ({ label: item.label, value: item.cost }))} /></div>
        </div>
        <div className="surface p-5">
          <h2 className="text-xl font-black">Descontos aplicados</h2>
          <div className="mt-4"><Bars money data={dailyRows.map((item) => ({ label: item.label, value: item.discount }))} /></div>
        </div>
        <div className="surface p-5">
          <h2 className="text-xl font-black">Taxas pagas</h2>
          <div className="mt-4"><Bars money data={dailyRows.map((item) => ({ label: item.label, value: item.fees }))} /></div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="surface p-5">
          <h2 className="text-xl font-black">Produtos mais lucrativos</h2>
          <div className="mt-4"><Bars money data={productProfitRows.slice(0, 8)} /></div>
        </div>
        <div className="surface p-5">
          <h2 className="text-xl font-black">Produtos que mais vendem</h2>
          <div className="mt-4"><Bars data={productSalesRows.map((item) => ({ label: item.productName, value: item._sum.quantity ?? 0 }))} /></div>
        </div>
        <div className="surface p-5">
          <h2 className="text-xl font-black">Produtos com maior margem</h2>
          <div className="mt-4"><Bars data={[...productMarginRows].reverse().slice(0, 8)} /></div>
        </div>
        <div className="surface p-5">
          <h2 className="text-xl font-black">Produtos com menor margem</h2>
          <div className="mt-4"><Bars data={productMarginRows.slice(0, 8)} /></div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-[var(--brand)]" />
            <h2 className="text-xl font-black">Alertas financeiros</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {[...productAlerts, ...lowProfitOrders.map((order) => ({
              type: order.profit < 0 ? "Pedido com prejuízo" : "Pedido com lucro baixo",
              text: `${order.orderNumber}: lucro ${formatCurrency(order.profit)}, margem ${order.margin.toFixed(2)}%${order.coupon ? `, cupom ${order.coupon}` : ""}.`,
            }))].slice(0, 14).map((alert, index) => (
              <div key={`${alert.type}-${index}`} className="rounded-lg border border-[#ffd8d1] bg-[#fff8f7] p-3 text-sm">
                <strong className="text-[var(--brand-dark)]">{alert.type}</strong>
                <p className="mt-1 text-[var(--muted)]">{alert.text}</p>
              </div>
            ))}
            {productAlerts.length === 0 && lowProfitOrders.length === 0 && (
              <p className="text-sm text-[var(--muted)]">Nenhum alerta financeiro relevante no momento.</p>
            )}
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <ReceiptText size={20} className="text-[var(--brand)]" />
            <h2 className="text-xl font-black">Pedidos mais rentáveis</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {bestOrders.map((order) => (
              <Link key={order.id} href={`/admin/pedidos/${order.id}`} className="flex justify-between gap-4 rounded-md border border-[var(--line)] p-3 text-sm hover:border-[var(--brand)]">
                <span className="font-black">{order.orderNumber}</span>
                <span>{formatCurrency(order.profit)} · {order.margin.toFixed(2)}%</span>
              </Link>
            ))}
            {bestOrders.length === 0 && <p className="text-sm text-[var(--muted)]">Sem pedidos pagos no período.</p>}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Faturamento bruto", "Total vendido antes de descontos, custos e taxas."],
          ["Receita líquida", "Valor após descontos e taxas principais."],
          ["Custo dos produtos vendidos", "Quanto a loja pagou pelos produtos vendidos."],
          ["Lucro bruto", "Venda menos custo do produto."],
          ["Margem de lucro", "Porcentagem de lucro sobre o preço de venda."],
        ].map(([title, text]) => (
          <div key={title} className="rounded-lg border border-[var(--line)] bg-white p-4">
            <Percent size={18} className="text-[var(--brand)]" />
            <strong className="mt-3 block">{title}</strong>
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
