import Image from "next/image";
import Link from "next/link";
import { AdminSubmitButton } from "@/components/admin/admin-submit";
import { updateOrderStatus } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate, statusBadgeClass, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statuses = ["PENDING", "PAID", "PREPARING", "AWAITING_PICKUP", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"];

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders");
  const { id } = await params;
  const order = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: {
      user: { include: { addresses: true } },
      coupon: true,
      shippingAddress: true,
      shippingMethod: true,
      pickupLocation: true,
      payments: { orderBy: { createdAt: "desc" } },
      items: { include: { product: true, variant: true } },
      inventoryMovements: { include: { inventory: { include: { product: true, variant: true } } } },
    },
  });

  const shippingSnapshot = order.shippingSnapshot as Record<string, string> | null;

  return (
    <div>
      <div className="admin-page-heading mb-6">
        <Link href="/admin/pedidos" className="text-sm font-black text-[var(--brand)] hover:text-[var(--brand-dark)]">&larr; Voltar para pedidos</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black md:text-4xl">{order.orderNumber}</h1>
          <span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>
        </div>
        <p className="admin-page-copy mt-2 text-sm">Compra realizada em {formatDate(order.createdAt)}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <section className="grid gap-6">
          <div className="surface overflow-hidden">
            <div className="border-b border-[var(--line)] p-5">
              <h2 className="text-xl font-black">Itens comprados</h2>
            </div>
            <div className="grid">
              {order.items.map((item) => (
                <div key={item.id} className="grid gap-4 border-b border-[var(--line)] p-5 md:grid-cols-[70px_1fr_auto]">
                  <div className="relative aspect-square overflow-hidden rounded-md bg-[#eef0f3]">
                    {item.imageUrl && <Image src={item.imageUrl} alt={item.productName} fill sizes="70px" className="object-cover" />}
                  </div>
                  <div>
                    <strong>{item.productName}</strong>
                    <p className="mt-1 text-sm text-[var(--muted)]">Código/SKU {item.sku} · {item.variant?.name ?? "Padrão"}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">Quantidade: {item.quantity} · Unitário: {formatCurrency(item.unitPrice)}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                      Custo snapshot: {formatCurrency(item.productCost)} · Lucro: {formatCurrency(item.netProfit)} · Margem {Number(item.profitMargin).toFixed(2)}%
                    </p>
                  </div>
                  <strong className="text-right">{formatCurrency(item.total)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="surface p-5">
            <h2 className="text-xl font-black">Resumo financeiro</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCurrency(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Desconto</dt><dd>- {formatCurrency(order.discount)}</dd></div>
              <div className="flex justify-between"><dt>Frete</dt><dd>{formatCurrency(order.shippingCost)}</dd></div>
              <div className="flex justify-between border-t border-[var(--line)] pt-3 text-xl font-black"><dt>Total</dt><dd>{formatCurrency(order.total)}</dd></div>
              <div className="flex justify-between border-t border-[var(--line)] pt-3"><dt>Custo dos produtos</dt><dd>{formatCurrency(order.productsCost)}</dd></div>
              <div className="flex justify-between"><dt>Taxas estimadas</dt><dd>{formatCurrency(Number(order.paymentFee) + Number(order.fixedFee))}</dd></div>
              <div className="flex justify-between"><dt>Embalagem + imposto</dt><dd>{formatCurrency(Number(order.packagingCost) + Number(order.estimatedTax))}</dd></div>
              <div className="flex justify-between text-base font-black"><dt>Lucro liquido estimado</dt><dd>{formatCurrency(order.netProfit)} · {Number(order.profitMargin).toFixed(2)}%</dd></div>
            </dl>
            {order.coupon && <p className="mt-3 text-sm font-bold text-[var(--muted)]">Cupom: {order.coupon.code}</p>}
          </div>

          <div className="surface p-5">
            <h2 className="text-xl font-black">Pagamentos</h2>
            <div className="mt-4 grid gap-3">
              {order.payments.map((payment) => (
                <div key={payment.id} className="rounded-lg border border-[var(--line)] p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-3">
                    <strong>{payment.provider} · {payment.method}</strong>
                    <span className={statusBadgeClass(payment.status)}>{statusLabel(payment.status)}</span>
                  </div>
                  <p className="mt-2 text-[var(--muted)]">Valor {formatCurrency(payment.amount)} · ID externo {payment.externalId ?? "não informado"}</p>
                  {payment.checkoutUrl && <a className="mt-2 inline-flex font-black text-[var(--brand)]" href={payment.checkoutUrl}>Abrir checkout Mercado Pago</a>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="grid gap-6 self-start xl:sticky xl:top-8">
          <form action={updateOrderStatus} className="surface grid gap-3 p-5">
            <h2 className="text-xl font-black">Atualizar pedido</h2>
            <input type="hidden" name="id" value={order.id} />
            <select className="field" name="status" defaultValue={order.status}>
              {statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
            </select>
            <textarea className="field min-h-28" name="notes" placeholder="Observações internas" defaultValue={order.notes ?? ""} />
            <AdminSubmitButton pendingText="Atualizando...">Salvar status</AdminSubmitButton>
          </form>

          <div className="surface p-5">
            <h2 className="text-xl font-black">Cliente</h2>
            <div className="mt-3 grid gap-1 text-sm text-[var(--muted)]">
              <span><strong className="text-[var(--ink)]">Nome:</strong> {order.customerName}</span>
              <span><strong className="text-[var(--ink)]">E-mail:</strong> {order.customerEmail}</span>
              <span><strong className="text-[var(--ink)]">Telefone:</strong> {order.customerPhone}</span>
              <span><strong className="text-[var(--ink)]">CPF/CNPJ:</strong> {order.document ?? "Nao informado"}</span>
            </div>
          </div>

          <div className="surface p-5">
            <h2 className="text-xl font-black">Entrega/retirada</h2>
            {order.shippingType === "PICKUP" ? (
              <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                <strong className="text-[var(--ink)]">Retirada na loja</strong>
                <span>{order.pickupLocation?.name}</span>
                <span>Protocolo: {order.pickupProtocol}</span>
                <span>{order.pickupLocation?.instructions}</span>
              </div>
            ) : (
              <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                <strong className="text-[var(--ink)]">{order.shippingMethod?.name ?? "Entrega"}</strong>
                <span>{order.shippingAddress?.street ?? shippingSnapshot?.street}, {order.shippingAddress?.number ?? shippingSnapshot?.number}</span>
                <span>{order.shippingAddress?.district ?? shippingSnapshot?.district} · {order.shippingAddress?.city ?? shippingSnapshot?.city}/{order.shippingAddress?.state ?? shippingSnapshot?.state}</span>
                <span>CEP {order.shippingAddress?.zipCode ?? shippingSnapshot?.zipCode}</span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
