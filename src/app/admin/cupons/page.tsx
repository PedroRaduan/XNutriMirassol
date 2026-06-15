import { createCoupon } from "@/lib/actions/admin";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-4xl font-black">Cupons</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="grid gap-3">
          {coupons.map((coupon) => (
            <article key={coupon.id} className="surface p-5">
              <div className="flex justify-between gap-3">
                <strong>{coupon.code}</strong>
                <span className="badge">{coupon.active ? "Ativo" : "Inativo"}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{coupon.description}</p>
              <p className="mt-2 text-sm font-bold">{coupon.type} · {coupon.type === "PERCENTAGE" ? `${coupon.value}%` : formatCurrency(coupon.value)}</p>
            </article>
          ))}
        </section>
        <form action={createCoupon} className="surface grid gap-3 self-start p-5">
          <h2 className="text-xl font-black">Novo cupom</h2>
          <input className="field" name="code" placeholder="CODIGO" required />
          <input className="field" name="description" placeholder="Descrição" />
          <select className="field" name="type" defaultValue="PERCENTAGE">
            <option value="PERCENTAGE">Percentual</option>
            <option value="FIXED_AMOUNT">Valor fixo</option>
            <option value="FREE_SHIPPING">Frete grátis</option>
          </select>
          <input className="field" name="value" type="number" step="0.01" placeholder="Valor" required />
          <input className="field" name="minSubtotal" type="number" step="0.01" placeholder="Subtotal mínimo" />
          <input className="field" name="usageLimit" type="number" placeholder="Limite de uso" />
          <label className="flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked /> Ativo</label>
          <button className="btn btn-primary">Criar cupom</button>
        </form>
      </div>
    </div>
  );
}
