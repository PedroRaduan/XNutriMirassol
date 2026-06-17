import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-submit";
import { deactivateCoupon, upsertCoupon } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function dateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16) : "";
}

function CouponForm({
  coupon,
  products,
  categories,
}: {
  coupon?: Awaited<ReturnType<typeof getCoupons>>[number];
  products: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}) {
  return (
    <form action={upsertCoupon} className="grid gap-3">
      {coupon && <input type="hidden" name="id" value={coupon.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="field" name="code" placeholder="XNUTRI10" defaultValue={coupon?.code} required />
        <select className="field" name="type" defaultValue={coupon?.type ?? "PERCENTAGE"}>
          <option value="PERCENTAGE">Porcentagem</option>
          <option value="FIXED_AMOUNT">Valor fixo</option>
          <option value="FREE_SHIPPING">Frete gratis</option>
        </select>
      </div>
      <input className="field" name="description" placeholder="Descricao interna" defaultValue={coupon?.description ?? ""} />
      <div className="grid gap-3 sm:grid-cols-3">
        <input className="field" name="value" type="number" step="0.01" min={0} placeholder="Valor" defaultValue={coupon ? Number(coupon.value) : ""} required />
        <input className="field" name="minSubtotal" type="number" step="0.01" min={0} placeholder="Compra minima" defaultValue={coupon?.minSubtotal ? Number(coupon.minSubtotal) : ""} />
        <input className="field" name="maxDiscount" type="number" step="0.01" min={0} placeholder="Desconto maximo" defaultValue={coupon?.maxDiscount ? Number(coupon.maxDiscount) : ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-black">Inicio<input className="field mt-2" name="startsAt" type="datetime-local" defaultValue={dateInput(coupon?.startsAt)} /></label>
        <label className="text-sm font-black">Expiracao<input className="field mt-2" name="endsAt" type="datetime-local" defaultValue={dateInput(coupon?.endsAt)} /></label>
        <label className="text-sm font-black">Limite<input className="field mt-2" name="usageLimit" type="number" min={0} defaultValue={coupon?.usageLimit ?? ""} /></label>
      </div>
      <label className="text-sm font-black">Produtos permitidos
        <select className="field mt-2 min-h-28" name="productIds" multiple defaultValue={coupon?.productIds ?? []}>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-black">Categorias permitidas
        <select className="field mt-2 min-h-24" name="categoryIds" multiple defaultValue={coupon?.categoryIds ?? []}>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-bold"><input className="accent-[var(--brand)]" name="active" type="checkbox" defaultChecked={coupon?.active ?? true} /> Ativo</label>
      <AdminSubmitButton>{coupon ? "Salvar cupom" : "Criar cupom"}</AdminSubmitButton>
    </form>
  );
}

async function getCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export default async function AdminCouponsPage() {
  await requireAdmin("coupons");
  const [coupons, products, categories] = await Promise.all([
    getCoupons(),
    prisma.product.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-6 text-white">
        <span className="text-xs font-black uppercase text-white/50">Marketing</span>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">Cupons</h1>
        <p className="mt-2 text-sm text-white/60">Crie descontos por percentual, valor fixo ou frete gratis, com regras de uso.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
        <section className="grid gap-4">
          {coupons.map((coupon) => (
            <article key={coupon.id} className="surface overflow-hidden">
              <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-xl">{coupon.code}</strong>
                    <span className="badge">{coupon.active ? "Ativo" : "Inativo"}</span>
                    <span className="badge">{coupon.type}</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{coupon.description}</p>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-3">
                    <span><strong className="block text-[var(--ink)]">Desconto</strong>{coupon.type === "PERCENTAGE" ? `${coupon.value}%` : formatCurrency(coupon.value)}</span>
                    <span><strong className="block text-[var(--ink)]">Compra minima</strong>{coupon.minSubtotal ? formatCurrency(coupon.minSubtotal) : "Sem minimo"}</span>
                    <span><strong className="block text-[var(--ink)]">Uso</strong>{coupon.usageCount}/{coupon.usageLimit ?? "sem limite"}</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-[var(--muted)]">
                    Validade: {coupon.startsAt ? formatDate(coupon.startsAt) : "agora"} ate {coupon.endsAt ? formatDate(coupon.endsAt) : "sem expiracao"}
                  </p>
                </div>
                <form action={deactivateCoupon}>
                  <input type="hidden" name="id" value={coupon.id} />
                  <ConfirmSubmitButton message="Desativar este cupom?">Desativar</ConfirmSubmitButton>
                </form>
              </div>
              <details className="border-t border-[var(--line)]">
                <summary className="cursor-pointer p-4 font-black text-[var(--brand)]">Editar regras</summary>
                <div className="border-t border-[var(--line)] p-4">
                  <CouponForm coupon={coupon} products={products} categories={categories} />
                </div>
              </details>
            </article>
          ))}
          {coupons.length === 0 && <div className="surface p-8 text-center text-[var(--muted)]">Nenhum cupom cadastrado.</div>}
        </section>

        <aside className="surface self-start p-5 xl:sticky xl:top-8">
          <h2 className="text-xl font-black">Novo cupom</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Exemplo: XNUTRI10 com 10% acima de R$ 100.</p>
          <div className="mt-4">
            <CouponForm products={products} categories={categories} />
          </div>
        </aside>
      </div>
    </div>
  );
}
