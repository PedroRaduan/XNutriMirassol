import Image from "next/image";
import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-submit";
import { deactivateCategory, upsertCategory } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function CategoryForm({ category }: { category?: Awaited<ReturnType<typeof getCategories>>[number] }) {
  return (
    <form action={upsertCategory} className="grid gap-3">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="field" name="name" placeholder="Nome" defaultValue={category?.name} required />
        <input className="field" name="slug" placeholder="slug-da-categoria" defaultValue={category?.slug} />
      </div>
      <textarea className="field min-h-24" name="description" placeholder="Descricao" defaultValue={category?.description ?? ""} />
      <input className="field" name="imageUrl" type="url" placeholder="URL da imagem" defaultValue={category?.imageUrl ?? ""} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input className="field" name="sortOrder" type="number" min={0} placeholder="Ordem" defaultValue={category?.sortOrder ?? 0} />
        <label className="flex items-center gap-2 text-sm font-bold">
          <input className="accent-[var(--brand)]" name="active" type="checkbox" defaultChecked={category?.active ?? true} />
          Ativa
        </label>
      </div>
      <AdminSubmitButton>{category ? "Salvar categoria" : "Criar categoria"}</AdminSubmitButton>
    </form>
  );
}

async function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export default async function AdminCategoriesPage() {
  await requireAdmin("categories");
  const categories = await getCategories();

  return (
    <div>
      <div className="mb-6 text-white">
        <span className="text-xs font-black uppercase text-white/50">Catalogo</span>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">Categorias</h1>
        <p className="mt-2 text-sm text-white/60">Controle vitrines, imagens, ordem e status das categorias.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="grid gap-4">
          {categories.map((category) => (
            <article key={category.id} className="surface overflow-hidden">
              <div className="grid gap-4 p-5 md:grid-cols-[120px_1fr_auto]">
                <div className="relative aspect-video overflow-hidden rounded-md bg-[#eef0f3] md:aspect-square">
                  {category.imageUrl && <Image src={category.imageUrl} alt={category.name} fill sizes="120px" className="object-cover" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{category.name}</strong>
                    <span className="badge">{category.active ? "Ativa" : "Inativa"}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">/{category.slug} · ordem {category.sortOrder}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{category.description}</p>
                  <span className="mt-3 block text-xs font-bold text-[var(--muted)]">{category._count.products} produto(s)</span>
                </div>
                <form action={deactivateCategory}>
                  <input type="hidden" name="id" value={category.id} />
                  <ConfirmSubmitButton message="Desativar esta categoria?">Desativar</ConfirmSubmitButton>
                </form>
              </div>
              <details className="border-t border-[var(--line)]">
                <summary className="cursor-pointer p-4 font-black text-[var(--brand)]">Editar</summary>
                <div className="border-t border-[var(--line)] p-4">
                  <CategoryForm category={category} />
                </div>
              </details>
            </article>
          ))}
        </section>

        <aside className="surface self-start p-5 lg:sticky lg:top-8">
          <h2 className="text-xl font-black">Nova categoria</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Categorias iniciais ja ficam no seed, mas voce pode criar novas.</p>
          <div className="mt-4">
            <CategoryForm />
          </div>
        </aside>
      </div>
    </div>
  );
}
