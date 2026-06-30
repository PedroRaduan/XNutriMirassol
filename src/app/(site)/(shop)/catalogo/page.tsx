import Link from "next/link";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { ProductCard, type ProductCardProduct } from "@/components/product/product-card";
import { prisma } from "@/lib/db/prisma";
import { demoFallbackOrThrow } from "@/lib/db/errors";
import {
  fallbackCategories,
  fallbackProducts,
  storefrontCategorySlugs,
  supplementSourceCategorySlugs,
} from "@/lib/fallback/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catálogo",
  description: "Confira suplementos, moda fitness e acessórios da XNutri Mirassol com retirada na loja e entrega regional.",
};

type CatalogSearchParams = Promise<{
  q?: string;
  category?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  promotion?: string;
  availability?: string;
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
  minPrice,
  maxPrice,
  promotion,
  availability,
}: {
  categories: CatalogCategory[];
  q?: string;
  category?: string;
  sort: string;
  minPrice?: number;
  maxPrice?: number;
  promotion?: boolean;
  availability?: boolean;
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <label className="text-sm font-black">
          Preço mínimo
          <input name="minPrice" type="number" min={0} step="0.01" defaultValue={minPrice ?? ""} className="field mt-2" placeholder="R$ 0,00" />
        </label>
        <label className="text-sm font-black">
          Preço máximo
          <input name="maxPrice" type="number" min={0} step="0.01" defaultValue={maxPrice ?? ""} className="field mt-2" placeholder="R$ 300,00" />
        </label>
      </div>
      <label className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white p-3 text-sm font-black">
        <input className="accent-[var(--brand)]" type="checkbox" name="promotion" value="1" defaultChecked={promotion} />
        Ver apenas promoções
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white p-3 text-sm font-black">
        <input className="accent-[var(--brand)]" type="checkbox" name="availability" value="1" defaultChecked={availability} />
        Somente disponíveis
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
  const minPrice = params.minPrice && Number.isFinite(Number(params.minPrice)) ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice && Number.isFinite(Number(params.maxPrice)) ? Number(params.maxPrice) : undefined;
  const onlyPromotion = params.promotion === "1";
  const onlyAvailable = params.availability === "1";
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
          onlyPromotion ? { OR: [{ promotion: true }, { compareAtPrice: { not: null } }] } : {},
          sort === "featured" ? { featured: true } : {},
          minPrice !== undefined ? { price: { gte: minPrice } } : {},
          maxPrice !== undefined ? { price: { lte: maxPrice } } : {},
          onlyAvailable
            ? {
                OR: [
                  { inventory: { some: { quantity: { gt: 0 } } } },
                  { variants: { some: { inventory: { quantity: { gt: 0 } } } } },
                ],
              }
            : {},
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
  ]).catch((error) => demoFallbackOrThrow(error, () => null));

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
      const matchesPromotion = onlyPromotion ? Boolean(product.promotion || product.compareAtPrice) : true;
      const matchesFeatured = sort === "featured" ? Boolean(product.featured) : true;
      const price = Number(product.price);
      const matchesMinPrice = minPrice !== undefined ? price >= minPrice : true;
      const matchesMaxPrice = maxPrice !== undefined ? price <= maxPrice : true;
      const stock = Math.max(product.inventory?.reduce((sum, item) => sum + item.quantity - item.reserved, 0) ?? 0, 0);
      const matchesAvailability = onlyAvailable ? stock > 0 : true;
      return matchesCategory && matchesQuery && matchesDiscount && matchesPromotion && matchesFeatured && matchesMinPrice && matchesMaxPrice && matchesAvailability;
    });
  }

  const currentCategory = category ? categories.find((item) => item.slug === category) : null;

  return (
    <div className="container-x py-10">
      <div className="relative overflow-hidden rounded-lg border border-[#ffd2ca] bg-gradient-to-br from-white via-[#fff7f6] to-[#ffe7e2] p-6 text-[var(--ink)] shadow-xl md:p-8">
        <div className="absolute right-[-4rem] top-[-5rem] h-44 w-44 rounded-full bg-[var(--brand)]/12 blur-2xl" />
        <div className="absolute bottom-[-5rem] left-[-4rem] h-44 w-44 rounded-full bg-[var(--brand-hot)]/10 blur-2xl" />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-[#ffc4bc] bg-white px-3 py-2 text-xs font-black uppercase text-[var(--brand-dark)]">
          <Sparkles size={14} className="text-[var(--brand)]" />
          Vitrine XNutri
        </span>
        <div className="relative mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black md:text-5xl">{currentCategory?.name ?? "Catálogo"}</h1>
            <p className="mt-3 max-w-2xl text-[var(--muted)]">
              Suplementos e roupas fitness com retirada na loja em Mirassol.
            </p>
          </div>
          <span className="rounded-full border border-[#ffc4bc] bg-white px-3 py-2 text-sm font-black text-[var(--brand-dark)]">{products.length} produto(s) encontrado(s)</span>
        </div>
      </div>

      <div className="mt-4 lg:hidden">
        <details className="surface mobile-filters overflow-hidden">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-black">
            <span className="inline-flex items-center gap-2"><SlidersHorizontal size={18} className="text-[var(--brand)]" /> Filtros e ordenação</span>
            <span className="text-sm text-[var(--brand)]">Abrir</span>
          </summary>
          <div className="border-t border-[var(--line)] p-4">
            <CatalogFilterForm categories={categories} q={q} category={category} sort={sort} minPrice={minPrice} maxPrice={maxPrice} promotion={onlyPromotion} availability={onlyAvailable} />
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
            <CatalogFilterForm categories={categories} q={q} category={category} sort={sort} minPrice={minPrice} maxPrice={maxPrice} promotion={onlyPromotion} availability={onlyAvailable} />
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
