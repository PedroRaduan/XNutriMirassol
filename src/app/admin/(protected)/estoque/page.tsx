import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type InventorySearchParams = Promise<{ filter?: string; q?: string }>;

export default async function AdminInventoryPage({ searchParams }: { searchParams: InventorySearchParams }) {
  await requireAdmin("inventory");
  const params = await searchParams;
  const filter = params.filter ?? "ALL";
  const q = params.q?.trim();

  const inventory = await prisma.inventory.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { product: { name: { contains: q, mode: "insensitive" } } },
              { product: { sku: { contains: q, mode: "insensitive" } } },
              { variant: { sku: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      product: { include: { category: true } },
      variant: true,
      movements: {
        include: { createdBy: { select: { name: true, email: true } }, order: { select: { orderNumber: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: [{ quantity: "asc" }, { updatedAt: "desc" }],
  });

  const visibleInventory = inventory.filter((item) => {
    if (filter === "LOW") return item.quantity <= item.lowStockThreshold;
    if (filter === "UNAVAILABLE") return item.quantity - item.reserved <= 0;
    return true;
  });

  return (
    <div>
      <div className="admin-page-heading mb-6">
        <span className="admin-eyebrow">Rotina da loja</span>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">Estoque</h1>
        <p className="admin-page-copy mt-2 text-sm">Atualize saldos, defina alertas de estoque baixo e veja o histórico de ajustes.</p>
      </div>

      <form className="surface mb-5 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <input className="field" name="q" defaultValue={q} placeholder="Buscar produto ou Código/SKU" />
        <select className="field" name="filter" defaultValue={filter}>
          <option value="ALL">Todos</option>
          <option value="LOW">Estoque baixo</option>
          <option value="UNAVAILABLE">Indisponiveis</option>
        </select>
        <button className="btn btn-secondary">Filtrar</button>
      </form>

      <div className="grid gap-4">
        {visibleInventory.map((item) => {
          const available = item.quantity - item.reserved;
          const low = item.quantity <= item.lowStockThreshold;
          return (
            <article key={item.id} className="surface grid gap-4 p-5 xl:grid-cols-[1fr_430px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{item.product.name}</strong>
                  <span className={low ? "stock-pill stock-pill-low" : "stock-pill"}>{available} disponível</span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {item.product.category.name} · {item.variant?.name ?? "Produto"} · Código/SKU {item.variant?.sku ?? item.product.sku}
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="text-[var(--muted)]">
                      <tr>
                        <th className="py-2">Data</th>
                        <th className="py-2">Tipo</th>
                        <th className="py-2">Qtd.</th>
                        <th className="py-2">Saldo</th>
                        <th className="py-2">Motivo</th>
                        <th className="py-2">Usuario/Pedido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.movements.map((movement) => (
                        <tr key={movement.id} className="border-t border-[var(--line)]">
                          <td className="py-2">{formatDate(movement.createdAt)}</td>
                          <td className="py-2 font-black">{movement.type}</td>
                          <td className="py-2">{movement.quantity}</td>
                          <td className="py-2">{movement.balance}</td>
                          <td className="py-2">{movement.reason}</td>
                          <td className="py-2">{movement.createdBy?.name ?? movement.createdBy?.email ?? movement.order?.orderNumber ?? "Configurações"}</td>
                        </tr>
                      ))}
                      {item.movements.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-[var(--muted)]">Sem movimentações recentes.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <AdminActionForm actionName="adjustInventory" className="grid gap-3 self-start rounded-lg border border-[var(--line)] bg-[#f8f9fb] p-4">
                <input type="hidden" name="inventoryId" value={item.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-black">Novo estoque<input className="field mt-2" name="quantity" type="number" defaultValue={item.quantity} min={0} /></label>
                  <label className="text-sm font-black">Alerta mínimo<input className="field mt-2" name="lowStockThreshold" type="number" defaultValue={item.lowStockThreshold} min={0} /></label>
                </div>
                <input className="field" name="reason" placeholder="Motivo" defaultValue="Ajuste manual" />
                <AdminSubmitButton pendingText="Ajustando...">Ajustar estoque</AdminSubmitButton>
              </AdminActionForm>
            </article>
          );
        })}
        {visibleInventory.length === 0 && (
          <div className="surface p-8 text-center text-[var(--muted)]">Nenhum item de estoque encontrado.</div>
        )}
      </div>
    </div>
  );
}
