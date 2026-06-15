import { createCategory } from "@/lib/actions/admin";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <h1 className="text-4xl font-black">Categorias</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="grid gap-3">
          {categories.map((category) => (
            <article key={category.id} className="surface p-5">
              <strong>{category.name}</strong>
              <p className="mt-1 text-sm text-[var(--muted)]">{category.description}</p>
              <span className="mt-3 block text-xs font-bold text-[var(--muted)]">{category._count.products} produto(s)</span>
            </article>
          ))}
        </section>
        <form action={createCategory} className="surface grid gap-3 self-start p-5">
          <h2 className="text-xl font-black">Nova categoria</h2>
          <input className="field" name="name" placeholder="Nome" required />
          <textarea className="field min-h-28" name="description" placeholder="Descrição" />
          <input className="field" name="imageUrl" type="url" placeholder="URL da imagem" />
          <button className="btn btn-primary">Criar categoria</button>
        </form>
      </div>
    </div>
  );
}
