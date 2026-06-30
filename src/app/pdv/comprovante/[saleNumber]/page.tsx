import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MessageCircle } from "lucide-react";
import { PrintButton } from "@/components/pdv/print-button";
import { XNutriLogo } from "@/components/layout/xnutri-logo";
import { returnPOSSaleItemFromForm } from "@/lib/actions/pos";
import { requirePOS } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function POSReceiptPage({
  params,
}: {
  params: Promise<{ saleNumber: string }>;
}) {
  const admin = await requirePOS();
  const { saleNumber } = await params;
  const sale = await prisma.pOSSale.findUnique({
    where: { saleNumber },
    include: {
      cashier: true,
      customer: true,
      items: true,
      payments: true,
    },
  });

  if (!sale) notFound();
  if (admin.adminRole === "CASHIER" && sale.cashierId !== admin.id) notFound();

  const whatsappText = encodeURIComponent(`Comprovante XNutri ${sale.saleNumber} - total ${formatCurrency(sale.total)}`);
  const emailSubject = encodeURIComponent(`Comprovante XNutri ${sale.saleNumber}`);
  const emailBody = encodeURIComponent(`Ola, segue o resumo da venda ${sale.saleNumber}. Total: ${formatCurrency(sale.total)}.`);

  return (
    <main className="min-h-screen bg-[#f4f4f5] py-6 print:bg-white print:py-0">
      <div className="container-x max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Link href="/pdv" className="btn btn-secondary">Voltar ao PDV</Link>
          <div className="flex flex-wrap gap-2">
            <PrintButton />
            <a className="btn btn-secondary" href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noreferrer">
              <MessageCircle size={17} />
              WhatsApp
            </a>
            {sale.customer?.email && (
              <a className="btn btn-secondary" href={`mailto:${sale.customer.email}?subject=${emailSubject}&body=${emailBody}`}>
                <Mail size={17} />
                E-mail
              </a>
            )}
          </div>
        </div>

        <article className="surface p-6 print:border-0 print:shadow-none">
          <header className="border-b border-dashed border-[var(--line)] pb-4 text-center">
            <XNutriLogo subtitle />
            <p className="mt-3 text-sm font-semibold text-[var(--muted)]">Mirassol-SP - Venda presencial</p>
            <h1 className="mt-3 text-xl font-black">Comprovante de venda</h1>
          </header>

          <section className="grid gap-2 border-b border-dashed border-[var(--line)] py-4 text-sm">
            <div className="flex justify-between gap-3"><span>Venda</span><strong>{sale.saleNumber}</strong></div>
            <div className="flex justify-between gap-3"><span>Data</span><strong>{formatDate(sale.createdAt)}</strong></div>
            <div className="flex justify-between gap-3"><span>Funcionario</span><strong>{sale.cashier.name ?? sale.cashier.email}</strong></div>
            <div className="flex justify-between gap-3"><span>Cliente</span><strong>{sale.customer?.name ?? sale.customer?.email ?? "Nao identificado"}</strong></div>
            <div className="flex justify-between gap-3"><span>Status</span><strong>{sale.status}</strong></div>
          </section>

          <section className="border-b border-dashed border-[var(--line)] py-4">
            <h2 className="mb-3 text-sm font-black uppercase text-[var(--muted)]">Itens</h2>
            <div className="grid gap-3">
              {sale.items.map((item) => (
                <div key={item.id} className="grid gap-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <strong>{item.productNameSnapshot}</strong>
                    <strong>{formatCurrency(item.total)}</strong>
                  </div>
                  <p className="text-xs font-semibold text-[var(--muted)]">
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                    {toNumber(item.discount) > 0 ? ` - desconto ${formatCurrency(item.discount)}` : ""}
                    {item.returnedQuantity > 0 ? ` - devolvido ${item.returnedQuantity}` : ""}
                  </p>
                  {sale.status !== "CANCELED" && sale.status !== "REFUNDED" && item.returnedQuantity < item.quantity && (
                    <details className="mt-2 rounded-md border border-[#ffd8d1] bg-[#fff8f7] p-2 print:hidden">
                      <summary className="cursor-pointer text-xs font-black text-[var(--brand-dark)]">Registrar devolucao deste item</summary>
                      <form action={returnPOSSaleItemFromForm} className="mt-2 grid gap-2 sm:grid-cols-[90px_1fr_auto]">
                        <input type="hidden" name="saleItemId" value={item.id} />
                        <input className="field" name="quantity" type="number" min={1} max={item.quantity - item.returnedQuantity} defaultValue={1} />
                        <input className="field" name="reason" placeholder="Motivo da devolucao" required />
                        <button className="btn btn-secondary border-red-200 bg-white text-red-700">Devolver</button>
                      </form>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-2 border-b border-dashed border-[var(--line)] py-4 text-sm">
            <div className="flex justify-between gap-3"><span>Subtotal</span><strong>{formatCurrency(sale.subtotal)}</strong></div>
            <div className="flex justify-between gap-3"><span>Descontos</span><strong>- {formatCurrency(sale.discountTotal)}</strong></div>
            <div className="flex justify-between gap-3 text-lg"><span>Total</span><strong className="text-[var(--brand)]">{formatCurrency(sale.total)}</strong></div>
            {toNumber(sale.changeAmount) > 0 && (
              <div className="flex justify-between gap-3"><span>Troco</span><strong>{formatCurrency(sale.changeAmount)}</strong></div>
            )}
          </section>

          <section className="grid gap-2 border-b border-dashed border-[var(--line)] py-4 text-sm">
            <h2 className="mb-1 text-sm font-black uppercase text-[var(--muted)]">Pagamento</h2>
            {sale.payments.map((payment) => (
              <div key={payment.id} className="flex justify-between gap-3">
                <span>{payment.method}</span>
                <strong>{formatCurrency(payment.amount)}</strong>
              </div>
            ))}
          </section>

          <footer className="pt-4 text-center text-sm font-semibold text-[var(--muted)]">
            Obrigado pela compra. Performance, saude e estilo em um so lugar.
            <p className="mt-2 text-xs">Este comprovante nao substitui documento fiscal.</p>
          </footer>
        </article>
      </div>
    </main>
  );
}
