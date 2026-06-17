import Link from "next/link";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { ProductCard, type ProductCardProduct } from "@/components/product/product-card";
import { prisma } from "@/lib/db/prisma";
import {
  fallbackCategories,
  fallbackProducts,
  storefrontCategorySlugs,
  supplementSourceCategorySlugs,
} from "@/lib/fallback/catalog";

export const dynamic = "force-dynamic";

type CatalogSearchParams = Promise<{
  q?: string;
  category?: string;
  sort?: string;
}>;

type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
};

function CatalogFilterForm({
  categories,
  q,
  category,
  sort,
}: {
  categories: CatalogCategory[];
  q?: string;
  category?: string;
  sort: string;
}) {
  return (
    <form className="grid gap-4">
      <label className="text-sm font-black">
        Busca
        <div className="field mt-2 flex items-center gap-2">
          <Search size={16} className="text-[var(--muted)]" />
          <input name="q" defaultValue={q} className="w-full bg-transparent outline-none" placeholder="Suplementos, roupas..." />
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
          <option value="featured">Destaques</option>
          <option value="discounts">Produtos com desconto</option>
          <option value="best">Mais vendidos</option>
          <option value="price-asc">Menor preço</option>
          <option value="price-desc">Maior preço</option>
        </select>
      </label>
      <button className="btn btn-primary">Aplicar filtros</button>
      <Link href="/catalogo" className="btn btn-secondary">Limpar</Link>
    </form>
  );
}

export default async function CatalogPage({ searchParams }: { searchParams: CatalogSearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim();
  const requestedCategory = params.category?.trim();
  const category = requestedCategory && storefrontCategorySlugs.includes(requestedCategory) ? requestedCategory : undefined;
  const sort = params.sort ?? "recent";
  const categoryFilter =
    category === "suplementos"
      ? { category: { slug: { in: supplementSourceCategorySlugs } } }
      : category === "roupas-fitness"
        ? { category: { slug: "roupas-fitness" } }
        : { category: { slug: { in: [...supplementSourceCategorySlugs, "roupas-fitness"] } } };

  const data = await Promise.all([
    prisma.category.findMany({
      where: { active: true, slug: { in: storefrontCategorySlugs } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        AND: [
          categoryFilter,
          q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                  { sku: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
          sort === "discounts" ? { OR: [{ promotion: true }, { compareAtPrice: { not: null } }] } : {},
          sort === "featured" ? { featured: true } : {},
        ],
      },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: true,
        inventory: true,
      },
      orderBy:
        sort === "price-asc"
          ? { price: "asc" }
          : sort === "price-desc"
            ? { price: "desc" }
            : sort === "best"
              ? { bestSeller: "desc" }
              : sort === "discounts"
                ? { updatedAt: "desc" }
                : sort === "featured"
                  ? { featured: "desc" }
              : { createdAt: "desc" },
    }),
  ]).catch(() => null);

  const categories = data?.[0]?.length === 2 ? data[0] : fallbackCategories;
  let products: ProductCardProduct[] = data?.[1] ?? fallbackProducts;

  if (!data) {
    products = products.filter((product) => {
      const fallbackCategory = fallbackCategories.find((item) => item.id === product.categoryId);
      const matchesCategory = category ? fallbackCategory?.slug === category : true;
      const query = q?.toLowerCase();
      const matchesQuery = query
        ? [product.name, product.description ?? product.shortDescription, product.sku].some((value) =>
            value.toLowerCase().includes(query),
          )
        : true;
      const matchesDiscount = sort === "discounts" ? Boolean(product.promotion || product.compareAtPrice) : true;
      const matchesFeatured = sort === "featured" ? Boolean(product.featured) : true;
      return matchesCategory && matchesQuery && matchesDiscount && matchesFeatured;
    });
  }

  const currentCategory = category ? categories.find((item) => item.slug === category) : null;

  return (
    <div className="container-x py-10">
      <div className="rounded-lg bg-[var(--ink)] p-6 text-white shadow-2xl md:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-black uppercase text-white/80">
          <Sparkles size={14} className="text-[#ffd2cc]" />
          Vitrine XNutri
        </span>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black md:text-5xl">{currentCategory?.name ?? "Catálogo"}</h1>
            <p className="mt-3 max-w-2xl text-white/70">
              Suplementos e roupas fitness com retirada na loja em Mirassol.
            </p>
          </div>
          <span className="text-sm font-black text-white/70">{products.length} produto(s) encontrado(s)</span>
        </div>
      </div>

      <div className="mt-4 lg:hidden">
        <details className="surface mobile-filters overflow-hidden">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-black">
            <span className="inline-flex items-center gap-2"><SlidersHorizontal size={18} className="text-[var(--brand)]" /> Filtros e ordenação</span>
            <span className="text-sm text-[var(--brand)]">Abrir</span>
          </summary>
          <div className="border-t border-[var(--line)] p-4">
            <CatalogFilterForm categories={categories} q={q} category={category} sort={sort} />
          </div>
        </details>
      </div>

      <div className="mt-4 grid gap-6 lg:mt-6 lg:grid-cols-[290px_1fr]">
        <aside className="surface hidden self-start p-5 lg:sticky lg:top-28 lg:block">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-[var(--brand)]" />
            <h2 className="text-xl font-black">Filtros</h2>
          </div>
          <div className="mt-5">
            <CatalogFilterForm categories={categories} q={q} category={category} sort={sort} />
          </div>
        </aside>

        <section>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
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
