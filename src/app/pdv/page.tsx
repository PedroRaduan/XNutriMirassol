import Link from "next/link";
import { LogOut, ReceiptText, Store, WalletCards } from "lucide-react";
import { POSTerminal } from "@/components/pdv/pos-terminal";
import { POSCashMovementForm, POSCloseSessionForm, POSOpenSessionForm } from "@/components/pdv/pos-session-forms";
import { XNutriLogo } from "@/components/layout/xnutri-logo";
import { logout } from "@/lib/actions/auth";
import { cancelPOSSaleFromForm } from "@/lib/actions/pos";
import { requirePOS } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const activePOSSaleStatuses = ["COMPLETED", "PARTIALLY_REFUNDED"] as const;

export default async function PDVPage() {
  const admin = await requirePOS();
  const isDemo = "isDemo" in admin && admin.isDemo;

  if (isDemo) {
    const demoName = admin.name ?? admin.email ?? "Equipe XNutri";
    return (
      <PDVShell adminName={demoName} role={admin.adminRole} isDemo>
        <POSTerminal sessionId="demo-session" cashierName={demoName} expectedAmount={150} isDemo />
      </PDVShell>
    );
  }

  const whereSales = admin.adminRole === "CASHIER" ? { cashierId: admin.id } : {};
  const [session, recentSales, todaySales] = await Promise.all([
    prisma.pOSSession.findFirst({
      where: { openedById: admin.id, status: "OPEN" },
      orderBy: { openedAt: "desc" },
    }),
    prisma.pOSSale.findMany({
      where: whereSales,
      include: { payments: true, cashier: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.pOSSale.findMany({
      where: {
        ...whereSales,
        status: { in: [...activePOSSaleStatuses] },
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      select: { total: true, netProfit: true },
    }),
  ]);

  const todayRevenue = todaySales.reduce((sum, sale) => sum + toNumber(sale.total), 0);
  const todayProfit = todaySales.reduce((sum, sale) => sum + toNumber(sale.netProfit), 0);

  return (
    <PDVShell adminName={admin.name ?? admin.email ?? "Equipe XNutri"} role={admin.adminRole}>
      {!session ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="surface overflow-hidden">
            <div className="bg-gradient-to-br from-[#111216] via-[#251315] to-[#f2382f] p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Caixa fechado</p>
              <h1 className="mt-2 text-3xl font-black">Abra o caixa para vender</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/78">
                Toda venda presencial baixa o mesmo estoque usado no site e aparece nos relatorios da empresa.
              </p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <Metric label="Vendas hoje" value={todaySales.length.toString()} />
              <Metric label="Faturamento hoje" value={formatCurrency(todayRevenue)} />
              <Metric label="Lucro estimado hoje" value={formatCurrency(todayProfit)} />
            </div>
          </section>
          <POSOpenSessionForm />
        </div>
      ) : (
        <div className="grid gap-5">
          <POSTerminal
            sessionId={session.id}
            cashierName={admin.name ?? admin.email ?? "Equipe XNutri"}
            expectedAmount={toNumber(session.expectedAmount)}
          />

          <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
            <div className="surface p-4">
              <div className="flex items-center gap-2">
                <WalletCards size={18} className="text-[var(--brand)]" />
                <h2 className="text-lg font-black">Caixa aberto</h2>
              </div>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between"><dt>Abertura</dt><dd className="font-black">{formatDate(session.openedAt)}</dd></div>
                <div className="flex justify-between"><dt>Valor inicial</dt><dd className="font-black">{formatCurrency(session.openingAmount)}</dd></div>
                <div className="flex justify-between"><dt>Dinheiro esperado</dt><dd className="font-black text-[var(--brand)]">{formatCurrency(session.expectedAmount)}</dd></div>
              </dl>
            </div>
            <POSCashMovementForm sessionId={session.id} />
            <POSCloseSessionForm sessionId={session.id} expectedAmount={toNumber(session.expectedAmount)} />
          </section>
        </div>
      )}

      <section className="surface mt-5 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Ultimas vendas</h2>
            <p className="text-sm font-semibold text-[var(--muted)]">Online e PDV compartilham estoque; aqui aparecem as vendas presenciais recentes.</p>
          </div>
          <Link className="btn btn-secondary px-3" href="/pdv/relatorios">
            <ReceiptText size={17} />
            Ver relatorios
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="py-2">Venda</th>
                <th>Data</th>
                <th>Caixa</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {recentSales.map((sale) => (
                <tr key={sale.id}>
                  <td className="py-3 font-black"><Link className="hover:text-[var(--brand)]" href={`/pdv/comprovante/${sale.saleNumber}`}>{sale.saleNumber}</Link></td>
                  <td>{formatDate(sale.createdAt)}</td>
                  <td>{sale.cashier.name ?? sale.cashier.email}</td>
                  <td>{sale.payments.map((payment) => payment.method).join(" + ")}</td>
                  <td><span className="status-badge status-paid">{sale.status}</span></td>
                  <td className="text-right">
                    <strong>{formatCurrency(sale.total)}</strong>
                    {sale.status === "COMPLETED" && (
                      <details className="mt-2 text-left">
                        <summary className="cursor-pointer text-xs font-black text-red-700">Cancelar</summary>
                        <form action={cancelPOSSaleFromForm} className="mt-2 grid gap-2">
                          <input type="hidden" name="saleId" value={sale.id} />
                          <input className="field min-w-56" name="reason" placeholder="Motivo do cancelamento" required />
                          <button className="btn btn-secondary border-red-200 bg-red-50 px-3 text-red-700">Confirmar cancelamento</button>
                        </form>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--muted)]">Nenhuma venda presencial registrada ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PDVShell>
  );
}

function PDVShell({
  adminName,
  role,
  isDemo = false,
  children,
}: {
  adminName: string;
  role: string;
  isDemo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f4f4f5] pb-24 md:pb-8">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#101115]/95 text-white backdrop-blur">
        <div className="container-x flex min-h-16 items-center justify-between gap-3 py-3">
          <Link href="/pdv" className="inline-flex">
            <XNutriLogo tone="light" subtitle={false} />
          </Link>
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-black">{adminName}</p>
            <p className="text-xs font-bold uppercase text-white/60">{role}{isDemo ? " demo" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link className="btn border border-white/15 bg-white/10 px-3 text-white hover:bg-white/15" href="/admin">
              <Store size={17} />
              Admin
            </Link>
            <form action={logout}>
              <button className="btn border border-white/15 bg-white/10 px-3 text-white hover:bg-white/15">
                <LogOut size={17} />
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="container-x py-5">
        {isDemo && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
            Modo de treinamento: a tela funciona para simular vendas, mas vendas, estoque e relatórios reais só são gravados quando o PostgreSQL estiver ligado e migrado.
          </div>
        )}
        {children}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[#fafafa] p-4">
      <span className="text-xs font-black uppercase text-[var(--muted)]">{label}</span>
      <strong className="mt-2 block text-2xl text-[var(--graphite)]">{value}</strong>
    </div>
  );
}
