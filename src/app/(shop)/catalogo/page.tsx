import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type CatalogSearchParams = Promise<{
  q?: string;
  category?: string;
  sort?: string;
}>;

export default async function CatalogPage({ searchParams }: { searchParams: CatalogSearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim();
  const category = params.category?.trim();
  const sort = params.sort ?? "recent";

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(category ? { category: { slug: category } } : {}),
      },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { take: 1 },
        inventory: true,
      },
      orderBy:
        sort === "price-asc"
          ? { price: "asc" }
          : sort === "price-desc"
            ? { price: "desc" }
            : sort === "best"
              ? { bestSeller: "desc" }
              : { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="container-x py-10">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="surface self-start p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} />
            <h1 className="text-xl font-black">Catálogo</h1>
          </div>
          <form className="mt-5 grid gap-4">
            <label className="text-sm font-black">
              Busca
              <div className="field mt-2 flex items-center gap-2">
                <Search size={16} className="text-[var(--muted)]" />
                <input name="q" defaultValue={q} className="w-full bg-transparent outline-none" />
              </div>
            </label>
            <label className="text-sm font-black">
              Categoria
              <select name="category" defaultValue={category} className="field mt-2">
                <option value="">Todas</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.slug}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-black">
              Ordenação
              <select name="sort" defaultValue={sort} className="field mt-2">
                <option value="recent">Mais recentes</option>
                <option value="best">Mais vendidos</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </label>
            <button className="btn btn-primary">Aplicar filtros</button>
            <Link href="/catalogo" className="btn btn-secondary">Limpar</Link>
          </form>
        </aside>

        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-black">{category ? categories.find((item) => item.slug === category)?.name : "Todos os produtos"}</h2>
              <p className="mt-2 text-[var(--muted)]">{products.length} produto(s) encontrado(s)</p>
            </div>
          </div>

          {products.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <div className="surface p-8 text-center">
              <h3 className="text-xl font-black">Nenhum produto encontrado</h3>
              <p className="mt-2 text-[var(--muted)]">Ajuste os filtros ou volte para o catálogo completo.</p>
              <Link href="/catalogo" className="btn btn-primary mt-5">Ver catálogo completo</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
