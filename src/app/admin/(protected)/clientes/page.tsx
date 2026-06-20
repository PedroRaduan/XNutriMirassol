import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate, statusBadgeClass, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CustomerSearchParams = Promise<{ q?: string }>;

export default async function AdminCustomersPage({ searchParams }: { searchParams: CustomerSearchParams }) {
  await requireAdmin("customers");
  const params = await searchParams;
  const q = params.q?.trim();
  const customers = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      orders: { include: { items: true }, orderBy: { createdAt: "desc" } },
      addresses: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="admin-page-heading mb-6">
        <span className="admin-eyebrow">Clientes</span>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">Clientes</h1>
        <p className="admin-page-copy mt-2 text-sm">Encontre clientes, veja pedidos, endereços e quanto cada um já comprou.</p>
      </div>

      <form className="surface mb-5 grid gap-3 p-4 md:grid-cols-[1fr_auto]">
        <div className="field flex items-center gap-2">
          <Search size={16} className="text-[var(--muted)]" />
          <input name="q" defaultValue={q} className="w-full bg-transparent outline-none" placeholder="Nome, email ou telefone" />
        </div>
        <button className="btn btn-secondary">Buscar</button>
      </form>

      <div className="grid gap-4">
        {customers.map((customer) => {
          const total = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);
          const lastOrder = customer.orders[0];
          return (
            <article key={customer.id} className="surface overflow-hidden">
              <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
                <div>
                  <strong className="text-xl">{customer.name ?? customer.email}</strong>
                  <p className="mt-1 text-sm text-[var(--muted)]">{customer.email} · {customer.phone ?? "sem telefone"} · desde {formatDate(customer.createdAt)}</p>
                </div>
                <div className="grid gap-1 text-sm font-bold text-[var(--muted)] md:text-right">
                  <span>{customer.orders.length} pedido(s)</span>
                  <span>{customer.addresses.length} endereco(s)</span>
                  <span>{formatCurrency(total)} gasto total</span>
                  <span>Ultimo pedido: {lastOrder ? formatDate(lastOrder.createdAt) : "sem pedido"}</span>
                </div>
              </div>

              <details className="border-t border-[var(--line)]">
                <summary className="cursor-pointer p-4 font-black text-[var(--brand)]">Histórico e endereços</summary>
                <div className="grid gap-4 border-t border-[var(--line)] p-4 lg:grid-cols-2">
                  <section>
                    <h2 className="font-black">Pedidos</h2>
                    <div className="mt-3 grid gap-2">
                      {customer.orders.map((order) => (
                        <div key={order.id} className="rounded-lg border border-[var(--line)] p-3 text-sm">
                          <div className="flex flex-wrap justify-between gap-2">
                            <strong>{order.orderNumber}</strong>
                            <span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>
                          </div>
                          <p className="mt-2 text-[var(--muted)]">{formatDate(order.createdAt)} · {order.items.length} item(ns) · {formatCurrency(order.total)}</p>
                        </div>
                      ))}
                      {customer.orders.length === 0 && <p className="text-sm text-[var(--muted)]">Sem pedidos.</p>}
                    </div>
                  </section>
                  <section>
                    <h2 className="font-black">Enderecos</h2>
                    <div className="mt-3 grid gap-2">
                      {customer.addresses.map((address) => (
                        <div key={address.id} className="rounded-lg border border-[var(--line)] p-3 text-sm text-[var(--muted)]">
                          <strong className="text-[var(--ink)]">{address.label}</strong>
                          <p className="mt-1">{address.street}, {address.number} · {address.district}</p>
                          <p>{address.city}/{address.state} · CEP {address.zipCode}</p>
                        </div>
                      ))}
                      {customer.addresses.length === 0 && <p className="text-sm text-[var(--muted)]">Sem endereços.</p>}
                    </div>
                  </section>
                </div>
              </details>
            </article>
          );
        })}
        {customers.length === 0 && <div className="surface p-8 text-center text-[var(--muted)]">Nenhum cliente encontrado.</div>}
      </div>
    </div>
  );
}
