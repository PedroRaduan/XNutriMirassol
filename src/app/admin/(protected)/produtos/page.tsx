import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-submit";
import { archiveProduct, deactivateProductVariant, upsertProduct, upsertProductVariant } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateSuggestedPrice, calculateUnitFinance } from "@/lib/finance/calculations";
import { formatCurrency, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProductSearchParams = Promise<{ q?: string; status?: string }>;

function attributesToText(value: unknown) {
  if (!value || typeof value !== "object") return "tipo=Padrão";
  return Object.entries(value as Record<string, string>).map(([key, item]) => `${key}=${item}`).join("\n");
}

function ProductForm({
  categories,
  product,
}: {
  categories: Array<{ id: string; name: string }>;
  product?: Awaited<ReturnType<typeof getProducts>>[number];
}) {
  const imageUrls = product?.images.map((image) => image.url).join("\n") ?? "";
  const stock = product?.inventory.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const lowStockThreshold = product?.inventory[0]?.lowStockThreshold ?? 5;
  const costPrice = toNumber(product?.costPrice ?? 0);
  const packagingCost = toNumber(product?.packagingCost ?? 0);
  const desiredMargin = toNumber(product?.desiredMargin ?? 35);
  const estimatedTaxRate = toNumber(product?.estimatedTaxRate ?? 0);
  const salePrice = toNumber(product?.price ?? 0);
  const suggestedPrice = calculateSuggestedPrice({ costPrice, packagingCost, desiredMargin, taxRate: estimatedTaxRate });
  const unitFinance = calculateUnitFinance({ price: salePrice, costPrice, packagingCost, taxRate: estimatedTaxRate });

  return (
    <form action={upsertProduct} className="grid gap-3">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-black">Categoria
          <select className="field mt-2" name="categoryId" defaultValue={product?.categoryId ?? ""} required>
            <option value="">Selecione</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-black">Status
          <select className="field mt-2" name="status" defaultValue={product?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Ativo</option>
            <option value="DRAFT">Rascunho</option>
            <option value="ARCHIVED">Arquivado</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-black">Nome<input className="field mt-2" name="name" defaultValue={product?.name} required /></label>
        <label className="text-sm font-black">URL do produto<input className="field mt-2" name="slug" defaultValue={product?.slug} placeholder="gerado automaticamente" /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-black">Código/SKU<input className="field mt-2" name="sku" defaultValue={product?.sku} required /></label>
        <label className="text-sm font-black">Preço<input className="field mt-2" name="price" type="number" step="0.01" min={0} defaultValue={product ? Number(product.price) : ""} required /></label>
        <label className="text-sm font-black">Preço anterior<input className="field mt-2" name="compareAtPrice" type="number" step="0.01" min={0} defaultValue={product?.compareAtPrice ? Number(product.compareAtPrice) : ""} /></label>
      </div>
      <section className="rounded-lg border border-[#ffd8d1] bg-[#fff8f7] p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-black">Analise financeira do produto</h3>
            <p className="text-xs font-semibold text-[var(--muted)]">Use valores gerenciais. Isso ajuda o painel a estimar lucro e margem.</p>
          </div>
          {product && (
            <span className={unitFinance.margin < 10 ? "status-badge status-canceled" : "status-badge status-paid"}>
              Margem {unitFinance.margin.toFixed(2)}%
            </span>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <label className="text-sm font-black">Custo do produto<input className="field mt-2" name="costPrice" type="number" step="0.01" min={0} defaultValue={product?.costPrice ? Number(product.costPrice) : ""} /></label>
          <label className="text-sm font-black">Custo embalagem<input className="field mt-2" name="packagingCost" type="number" step="0.01" min={0} defaultValue={product?.packagingCost ? Number(product.packagingCost) : ""} /></label>
          <label className="text-sm font-black">Margem desejada %<input className="field mt-2" name="desiredMargin" type="number" step="0.01" min={0} defaultValue={product?.desiredMargin ? Number(product.desiredMargin) : ""} placeholder="35" /></label>
          <label className="text-sm font-black">Imposto estimado %<input className="field mt-2" name="estimatedTaxRate" type="number" step="0.01" min={0} defaultValue={product?.estimatedTaxRate ? Number(product.estimatedTaxRate) : ""} placeholder="0" /></label>
        </div>
        {product && (
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-md bg-white p-3">
              <span className="block text-xs font-bold text-[var(--muted)]">Preco sugerido</span>
              <strong>{suggestedPrice > 0 ? formatCurrency(suggestedPrice) : "Cadastre o custo"}</strong>
            </div>
            <div className="rounded-md bg-white p-3">
              <span className="block text-xs font-bold text-[var(--muted)]">Lucro estimado por unidade</span>
              <strong>{formatCurrency(unitFinance.netProfit)}</strong>
            </div>
            <div className="rounded-md bg-white p-3">
              <span className="block text-xs font-bold text-[var(--muted)]">Margem estimada</span>
              <strong>{unitFinance.margin.toFixed(2)}%</strong>
            </div>
          </div>
        )}
      </section>
      <label className="text-sm font-black">Descrição curta<input className="field mt-2" name="shortDescription" defaultValue={product?.shortDescription} required /></label>
      <label className="text-sm font-black">Descrição completa<textarea className="field mt-2 min-h-28" name="description" defaultValue={product?.description} required /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-black">Estoque principal<input className="field mt-2" name="stock" type="number" min={0} defaultValue={stock} required /></label>
        <label className="text-sm font-black">Alerta mínimo<input className="field mt-2" name="lowStockThreshold" type="number" min={0} defaultValue={lowStockThreshold} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm font-black">Peso (g)<input className="field mt-2" name="weightGrams" type="number" min={0} defaultValue={product?.weightGrams ?? 300} /></label>
        <label className="text-sm font-black">Altura (cm)<input className="field mt-2" name="heightCm" type="number" min={0} defaultValue={product?.heightCm ?? 22} /></label>
        <label className="text-sm font-black">Largura (cm)<input className="field mt-2" name="widthCm" type="number" min={0} defaultValue={product?.widthCm ?? 16} /></label>
        <label className="text-sm font-black">Comprimento (cm)<input className="field mt-2" name="lengthCm" type="number" min={0} defaultValue={product?.lengthCm ?? 16} /></label>
      </div>
      <label className="text-sm font-black">Imagens
        <textarea className="field mt-2 min-h-24" name="imageUrls" defaultValue={imageUrls} placeholder="Uma URL por linha" required />
      </label>
      <div className="grid gap-2 rounded-lg border border-[var(--line)] bg-[#f8f9fb] p-3 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-sm font-bold"><input className="accent-[var(--brand)]" name="featured" type="checkbox" defaultChecked={product?.featured} /> Destaque</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input className="accent-[var(--brand)]" name="bestSeller" type="checkbox" defaultChecked={product?.bestSeller} /> Mais vendido</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input className="accent-[var(--brand)]" name="promotion" type="checkbox" defaultChecked={product?.promotion} /> Promoção</label>
      </div>
      <AdminSubmitButton>{product ? "Salvar alterações" : "Cadastrar produto"}</AdminSubmitButton>
    </form>
  );
}

function VariantForm({ productId, variant }: { productId: string; variant?: Awaited<ReturnType<typeof getProducts>>[number]["variants"][number] }) {
  return (
    <form action={upsertProductVariant} className="grid gap-3 rounded-lg border border-[var(--line)] bg-[#fafafa] p-3">
      <input type="hidden" name="productId" value={productId} />
      {variant && <input type="hidden" name="id" value={variant.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <input className="field" name="name" placeholder="Nome da variação" defaultValue={variant?.name} required />
        <input className="field" name="sku" placeholder="Código/SKU próprio" defaultValue={variant?.sku} required />
        <input className="field" name="priceAdjustment" type="number" min={0} step="0.01" placeholder="Preço extra" defaultValue={variant ? Number(variant.priceAdjustment) : ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="field" name="costPrice" type="number" min={0} step="0.01" placeholder="Custo desta variacao" defaultValue={variant?.costPrice ? Number(variant.costPrice) : ""} />
        <input className="field" name="packagingCost" type="number" min={0} step="0.01" placeholder="Embalagem desta variacao" defaultValue={variant?.packagingCost ? Number(variant.packagingCost) : ""} />
      </div>
      <textarea className="field min-h-20" name="attributes" placeholder={"sabor=Chocolate\ntamanho=M\ncor=Preta"} defaultValue={variant ? attributesToText(variant.attributes) : ""} required />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input className="field" name="stock" type="number" min={0} placeholder="Estoque" defaultValue={variant?.inventory?.quantity ?? 0} required />
        <input className="field" name="lowStockThreshold" type="number" min={0} placeholder="Mínimo" defaultValue={variant?.inventory?.lowStockThreshold ?? 5} />
        <label className="flex items-center gap-2 text-sm font-bold"><input className="accent-[var(--brand)]" name="active" type="checkbox" defaultChecked={variant?.active ?? true} /> Ativa</label>
      </div>
      <AdminSubmitButton pendingText="Salvando variação...">{variant ? "Salvar variação" : "Criar variação"}</AdminSubmitButton>
    </form>
  );
}

async function getProducts(q?: string, status?: string) {
  return prisma.product.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as "ACTIVE" | "DRAFT" | "ARCHIVED" } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      inventory: { include: { variant: true } },
      variants: { include: { inventory: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function AdminProductsPage({ searchParams }: { searchParams: ProductSearchParams }) {
  await requireAdmin("products");
  const params = await searchParams;
  const q = params.q?.trim();
  const status = params.status ?? "ALL";
  const [products, categories] = await Promise.all([
    getProducts(q, status),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div>
      <div className="admin-page-heading mb-6">
        <span className="admin-eyebrow">Catálogo</span>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">Produtos</h1>
        <p className="admin-page-copy mt-2 text-sm">Cadastre e edite produtos com imagens, preços, estoque, status, tamanhos e sabores.</p>
      </div>

      <form className="surface mb-5 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <div className="field flex items-center gap-2">
          <Search size={16} className="text-[var(--muted)]" />
          <input name="q" defaultValue={q} className="w-full bg-transparent outline-none" placeholder="Buscar por nome, código ou URL" />
        </div>
        <select className="field" name="status" defaultValue={status}>
          <option value="ALL">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="DRAFT">Rascunhos</option>
          <option value="ARCHIVED">Arquivados</option>
        </select>
        <button className="btn btn-secondary">Filtrar</button>
      </form>

      <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
        <section className="grid gap-4">
          {products.map((product) => {
            const stock = product.inventory.reduce((sum, item) => sum + item.quantity - item.reserved, 0);
            const low = product.inventory.some((item) => item.quantity <= item.lowStockThreshold);
            const productFinance = calculateUnitFinance({
              price: toNumber(product.price),
              costPrice: toNumber(product.costPrice ?? 0),
              packagingCost: toNumber(product.packagingCost ?? 0),
              taxRate: toNumber(product.estimatedTaxRate ?? 0),
            });
            return (
              <article key={product.id} className="surface overflow-hidden">
                <div className="grid gap-4 border-b border-[var(--line)] p-4 md:grid-cols-[86px_1fr_auto]">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-[#eceef1]">
                    {product.images[0] && <Image src={product.images[0].url} alt={product.name} fill sizes="86px" className="object-cover" />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{product.name}</strong>
                      <span className="badge">{product.status}</span>
                      {product.promotion && <span className="badge border-transparent bg-[var(--brand)] text-white">Promo</span>}
                      {product.featured && <span className="badge">Destaque</span>}
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">{product.category.name} · {product.sku}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={low ? "stock-pill stock-pill-low" : "stock-pill"}>{stock} disponível</span>
                      <span className="text-sm font-black">{formatCurrency(product.price)}</span>
                      <span className={productFinance.margin < 10 ? "status-badge status-canceled" : "status-badge status-paid"}>
                        Lucro {formatCurrency(productFinance.netProfit)} · {productFinance.margin.toFixed(1)}%
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Link href={`/produto/${product.slug}`} className="btn btn-secondary px-3">Ver loja</Link>
                    <form action={archiveProduct}>
                      <input type="hidden" name="id" value={product.id} />
                      <ConfirmSubmitButton message="Arquivar este produto?">Arquivar</ConfirmSubmitButton>
                    </form>
                  </div>
                </div>

                <details className="border-b border-[var(--line)]">
                  <summary className="flex cursor-pointer items-center gap-2 p-4 font-black text-[var(--brand)]">
                    <Pencil size={16} />
                    Editar produto
                  </summary>
                  <div className="border-t border-[var(--line)] p-4">
                    <ProductForm categories={categories} product={product} />
                  </div>
                </details>

                <details>
                  <summary className="flex cursor-pointer items-center gap-2 p-4 font-black text-[var(--brand)]">
                    <Plus size={16} />
                    Tamanhos, sabores e variações ({product.variants.length})
                  </summary>
                  <div className="grid gap-3 border-t border-[var(--line)] p-4">
                    {product.variants.map((variant) => (
                      <div key={variant.id} className="grid gap-2">
                        <VariantForm productId={product.id} variant={variant} />
                        <form action={deactivateProductVariant} className="flex justify-end">
                          <input type="hidden" name="id" value={variant.id} />
                          <ConfirmSubmitButton message="Desativar esta variação?">Desativar variação</ConfirmSubmitButton>
                        </form>
                      </div>
                    ))}
                    <VariantForm productId={product.id} />
                  </div>
                </details>
              </article>
            );
          })}
          {products.length === 0 && (
            <div className="surface p-8 text-center text-[var(--muted)]">Nenhum produto encontrado.</div>
          )}
        </section>

        <aside className="surface self-start p-5 xl:sticky xl:top-8">
          <h2 className="text-xl font-black">Novo produto</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Preencha o básico primeiro. Depois você pode adicionar tamanhos, sabores ou cores.</p>
          <div className="mt-4">
            <ProductForm categories={categories} />
          </div>
        </aside>
      </div>
    </div>
  );
}
