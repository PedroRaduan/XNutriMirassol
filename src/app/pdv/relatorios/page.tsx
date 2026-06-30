import Link from "next/link";
import { BarChart3, CalendarDays, CircleDollarSign, Package, ReceiptText, TrendingUp, Users } from "lucide-react";
import { requirePOS } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ReportSearchParams = Promise<{ period?: string; start?: string; end?: string }>;

function rangeFor(period = "today", start?: string, end?: string) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (period === "custom" && start && end) {
    const from = new Date(`${start}T00:00:00`);
    const to = new Date(`${end}T23:59:59`);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) return { from, to };
  }

  if (period === "7d") {
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - 6);
    return { from, to: endOfToday };
  }
  if (period === "30d") {
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - 29);
    return { from, to: endOfToday };
  }
  if (period === "month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfToday };
  }
  if (period === "last-month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  if (period === "year") {
    return { from: new Date(now.getFullYear(), 0, 1), to: endOfToday };
  }

  return { from: startOfToday, to: endOfToday };
}

const activePOSSaleStatuses = ["COMPLETED", "PARTIALLY_REFUNDED"] as const;

export default async function PDVReportsPage({ searchParams }: { searchParams: ReportSearchParams }) {
  const admin = await requirePOS();
  const params = await searchParams;
  const period = params.period ?? "today";
  const { from, to } = rangeFor(period, params.start, params.end);
  const scope = admin.adminRole === "CASHIER" ? { cashierId: admin.id } : {};

  const sales = await prisma.pOSSale.findMany({
    where: {
      ...scope,
      createdAt: { gte: from, lte: to },
    },
    include: { items: true, payments: true, cashier: true },
    orderBy: { createdAt: "desc" },
  });

  const completed = sales.filter((sale) => activePOSSaleStatuses.includes(sale.status as (typeof activePOSSaleStatuses)[number]));
  const discounts = completed.reduce((sum, sale) => sum + toNumber(sale.discountTotal), 0);
  const revenue = completed.reduce((sum, sale) => sum + toNumber(sale.total), 0);
  const costs = completed.reduce((sum, sale) => sum + toNumber(sale.costTotal), 0);
  const fees = completed.reduce((sum, sale) => sum + toNumber(sale.feeTotal), 0);
  const profit = completed.reduce((sum, sale) => sum + toNumber(sale.netProfit), 0);
  const ticket = completed.length ? revenue / completed.length : 0;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const byPayment = new Map<string, number>();
  const byCashier = new Map<string, { total: number; count: number }>();
  const byProduct = new Map<string, { quantity: number; total: number; profit: number }>();

  for (const sale of completed) {
    const cashier = sale.cashier.name ?? sale.cashier.email;
    const cashierRow = byCashier.get(cashier) ?? { total: 0, count: 0 };
    cashierRow.total += toNumber(sale.total);
    cashierRow.count += 1;
    byCashier.set(cashier, cashierRow);

    for (const payment of sale.payments) {
      byPayment.set(payment.method, (byPayment.get(payment.method) ?? 0) + toNumber(payment.amount));
    }
    for (const item of sale.items) {
      const remainingQuantity = item.quantity - item.returnedQuantity;
      if (remainingQuantity <= 0) continue;
      const remainingRatio = remainingQuantity / item.quantity;
      const row = byProduct.get(item.productNameSnapshot) ?? { quantity: 0, total: 0, profit: 0 };
      row.quantity += remainingQuantity;
      row.total += toNumber(item.total) * remainingRatio;
      row.profit += toNumber(item.netProfit) * remainingRatio;
      byProduct.set(item.productNameSnapshot, row);
    }
  }

  const productRows = [...byProduct.entries()]
    .map(([label, value]) => ({ label, ...value, margin: value.total > 0 ? (value.profit / value.total) * 100 : 0 }))
    .sort((a, b) => b.quantity - a.quantity);
  const profitRows = [...productRows].sort((a, b) => b.profit - a.profit);
  const lowMarginRows = [...productRows].sort((a, b) => a.margin - b.margin);

  return (
    <main className="min-h-screen bg-[#f4f4f5] pb-10">
      <header className="border-b border-white/10 bg-[#101115] text-white">
        <div className="container-x flex min-h-16 items-center justify-between gap-3 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/60">PDV XNutri</p>
            <h1 className="text-2xl font-black">Relatorios presenciais</h1>
          </div>
          <Link className="btn border border-white/15 bg-white/10 text-white hover:bg-white/15" href="/pdv">
            Voltar ao caixa
          </Link>
        </div>
      </header>

      <div className="container-x py-5">
        <section className="surface mb-5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays size={18} className="text-[var(--brand)]" />
            <h2 className="text-lg font-black">Periodo</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["today", "Hoje"],
              ["7d", "Ultimos 7 dias"],
              ["30d", "Ultimos 30 dias"],
              ["month", "Mes atual"],
              ["last-month", "Mes passado"],
              ["year", "Ano atual"],
            ].map(([key, label]) => (
              <Link key={key} href={`/pdv/relatorios?period=${key}`} className={`btn px-3 ${period === key ? "btn-primary" : "btn-secondary"}`}>
                {label}
              </Link>
            ))}
          </div>
          <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="period" value="custom" />
            <input className="field" type="date" name="start" defaultValue={params.start} />
            <input className="field" type="date" name="end" defaultValue={params.end} />
            <button className="btn btn-dark">Filtrar personalizado</button>
          </form>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Vendas" value={completed.length.toString()} Icon={ReceiptText} />
          <Metric label="Faturamento" value={formatCurrency(revenue)} Icon={CircleDollarSign} />
          <Metric label="Lucro estimado" value={formatCurrency(profit)} Icon={TrendingUp} />
          <Metric label="Ticket medio" value={formatCurrency(ticket)} Icon={Users} />
          <Metric label="Descontos" value={formatCurrency(discounts)} Icon={BarChart3} />
          <Metric label="Taxas" value={formatCurrency(fees)} Icon={CircleDollarSign} />
          <Metric label="CMV" value={formatCurrency(costs)} Icon={Package} />
          <Metric label="Margem media" value={`${margin.toFixed(1)}%`} Icon={TrendingUp} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <Panel title="Formas de pagamento">
            <Bars data={[...byPayment.entries()].map(([label, value]) => ({ label, value }))} money />
          </Panel>
          <Panel title="Vendas por funcionario">
            <Bars data={[...byCashier.entries()].map(([label, value]) => ({ label, value: value.total, hint: `${value.count} venda(s)` }))} money />
          </Panel>
          <Panel title="Produtos mais vendidos no PDV">
            <Bars data={productRows.slice(0, 8).map((item) => ({ label: item.label, value: item.quantity, hint: formatCurrency(item.total) }))} />
          </Panel>
          <Panel title="Produtos mais lucrativos">
            <Bars data={profitRows.slice(0, 8).map((item) => ({ label: item.label, value: item.profit, hint: `${item.margin.toFixed(1)}%` }))} money />
          </Panel>
          <Panel title="Produtos com menor margem">
            <Bars data={lowMarginRows.slice(0, 8).map((item) => ({ label: item.label, value: item.margin, hint: formatCurrency(item.profit) }))} suffix="%" />
          </Panel>
          <Panel title="Vendas recentes">
            <div className="grid gap-2">
              {sales.slice(0, 8).map((sale) => (
                <Link key={sale.id} href={`/pdv/comprovante/${sale.saleNumber}`} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white p-3 text-sm hover:border-[#ffb5aa]">
                  <span>
                    <strong>{sale.saleNumber}</strong>
                    <span className="block text-xs text-[var(--muted)]">{formatDate(sale.createdAt)} - {sale.status}</span>
                  </span>
                  <strong>{formatCurrency(sale.total)}</strong>
                </Link>
              ))}
              {sales.length === 0 && <p className="text-sm text-[var(--muted)]">Nenhuma venda no periodo.</p>}
            </div>
          </Panel>
        </section>

        <section className="surface mt-5 p-4 text-sm leading-6 text-[var(--muted)]">
          <h2 className="text-lg font-black text-[var(--graphite)]">Como ler estes numeros</h2>
          <p className="mt-2"><strong>Faturamento bruto</strong> e o total antes de descontos, custos e taxas. <strong>Receita liquida</strong> e o valor vendido apos descontos e taxas principais. <strong>CMV</strong> mostra quanto a loja pagou pelos produtos vendidos. <strong>Lucro liquido estimado</strong> desconta custo, taxas, embalagem e imposto configurado. <strong>Margem</strong> e a porcentagem de lucro sobre a venda.</p>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, Icon }: { label: string; value: string; Icon: typeof ReceiptText }) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase text-[var(--muted)]">{label}</span>
        <Icon size={18} className="text-[var(--brand)]" />
      </div>
      <strong className="mt-3 block text-2xl">{value}</strong>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface p-4">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Bars({ data, money = false, suffix = "" }: { data: Array<{ label: string; value: number; hint?: string }>; money?: boolean; suffix?: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="grid gap-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate font-bold">{item.label}</span>
            <strong>{money ? formatCurrency(item.value) : `${item.value.toFixed(suffix ? 1 : 0)}${suffix}`}</strong>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#eef0f3]">
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-hot)]" style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }} />
          </div>
          {item.hint && <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{item.hint}</p>}
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-[var(--muted)]">Sem dados no periodo.</p>}
    </div>
  );
}
