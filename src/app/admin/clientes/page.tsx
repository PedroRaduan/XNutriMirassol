import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: "CLIENT" },
    include: { orders: true, addresses: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-4xl font-black">Clientes</h1>
      <div className="mt-6 grid gap-4">
        {customers.map((customer) => {
          const total = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);
          return (
            <article key={customer.id} className="surface grid gap-3 p-5 md:grid-cols-[1fr_auto]">
              <div>
                <strong>{customer.name ?? customer.email}</strong>
                <p className="mt-1 text-sm text-[var(--muted)]">{customer.email} · {customer.phone ?? "sem telefone"}</p>
              </div>
              <div className="text-sm font-bold text-[var(--muted)]">
                {customer.orders.length} pedido(s) · {customer.addresses.length} endereço(s) · {formatCurrency(total)}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
