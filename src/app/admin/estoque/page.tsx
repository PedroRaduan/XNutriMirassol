import { adjustInventory } from "@/lib/actions/admin";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const inventory = await prisma.inventory.findMany({
    include: { product: true, variant: true, movements: { orderBy: { createdAt: "desc" }, take: 3 } },
    orderBy: { quantity: "asc" },
  });

  return (
    <div>
      <h1 className="text-4xl font-black">Estoque</h1>
      <div className="mt-6 grid gap-4">
        {inventory.map((item) => (
          <article key={item.id} className="surface grid gap-4 p-5 lg:grid-cols-[1fr_360px]">
            <div>
              <strong>{item.product.name}</strong>
              <p className="mt-1 text-sm text-[var(--muted)]">{item.variant?.name} · disponível {item.quantity - item.reserved}</p>
              <div className="mt-3 grid gap-1 text-xs text-[var(--muted)]">
                {item.movements.map((movement) => (
                  <span key={movement.id}>{movement.type}: {movement.quantity} · saldo {movement.balance} · {movement.reason}</span>
                ))}
              </div>
            </div>
            <form action={adjustInventory} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="inventoryId" value={item.id} />
              <input className="field" name="quantity" type="number" defaultValue={item.quantity} min={0} />
              <input className="field" name="reason" placeholder="Motivo" defaultValue="Ajuste manual" />
              <button className="btn btn-primary">Ajustar</button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
