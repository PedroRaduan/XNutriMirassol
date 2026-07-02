import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Pencil, Plus, Search } from "lucide-react";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-submit";
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

function AdminFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-form-section">
      <div>
        <h3 className="font-black text-[var(--ink)]">{title}</h3>
        {description && <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">{description}</p>}
      </div>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
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
    <AdminActionForm
      actionName="upsertProduct"
      closeDetailsOnSuccess
      resetOnSuccess={!product}
      className="grid gap-4"
    >
      {product && <input type="hidden" name="id" value={product.id} />}

      <AdminFormSection title="Informações principais" description="Nome, categoria e textos exibidos na loja.">
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
          <label className="text-sm font-black">URL do produto<input className="field mt-2" name="slug" defaultValue={product?.slug} placeholder="gerada automaticamente" /></label>
        </div>
        <label className="text-sm font-black">Descrição curta<input className="field mt-2" name="shortDescription" defaultValue={product?.shortDescription} required /></label>
        <label className="text-sm font-black">Descrição completa<textarea className="field mt-2 min-h-28" name="description" defaultValue={product?.description} required /></label>
      </AdminFormSection>

      <AdminFormSection title="Preço e identificação" description="Dados comerciais e códigos usados no estoque e no PDV.">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-black">Código/SKU<input className="field mt-2" name="sku" defaultValue={product?.sku} required /></label>
          <label className="text-sm font-black">Preço<input className="field mt-2" name="price" type="number" step="0.01" min={0} defaultValue={product ? Number(product.price) : ""} required /></label>
          <label className="text-sm font-black">Preço anterior<input className="field mt-2" name="compareAtPrice" type="number" step="0.01" min={0} defaultValue={product?.compareAtPrice ? Number(product.compareAtPrice) : ""} /></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-black">Código de barras<input className="field mt-2" name="barcode" inputMode="numeric" defaultValue={product?.barcode ?? ""} placeholder="Leitor ou digitação" /></label>
          <label className="text-sm font-black">EAN<input className="field mt-2" name="ean" inputMode="numeric" defaultValue={product?.ean ?? ""} placeholder="789..." /></label>
          <label className="text-sm font-black">Código interno<input className="field mt-2" name="internalCode" defaultValue={product?.internalCode ?? ""} placeholder="XN-CAIXA-001" /></label>
        </div>
      </AdminFormSection>

      <section className="admin-form-section">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-black">Análise financeira do produto</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">Valores internos para estimar lucro e margem. Eles não aparecem para o cliente.</p>
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
            <div className="rounded-md bg-[#f7f8fa] p-3">
              <span className="block text-xs font-bold text-[var(--muted)]">Preço sugerido</span>
              <strong>{suggestedPrice > 0 ? formatCurrency(suggestedPrice) : "Cadastre o custo"}</strong>
            </div>
            <div className="rounded-md bg-[#f7f8fa] p-3">
              <span className="block text-xs font-bold text-[var(--muted)]">Lucro estimado por unidade</span>
              <strong>{formatCurrency(unitFinance.netProfit)}</strong>
            </div>
            <div className="rounded-md bg-[#f7f8fa] p-3">
              <span className="block text-xs font-bold text-[var(--muted)]">Margem estimada</span>
              <strong>{unitFinance.margin.toFixed(2)}%</strong>
            </div>
          </div>
        )}
      </section>

      <AdminFormSection title="Estoque e envio" description="Quantidade disponível e medidas usadas no cálculo do frete.">
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
      </AdminFormSection>

      <AdminFormSection title="Imagens e destaques" description="Use uma URL de imagem por linha e escolha onde o produto será destacado.">
        <label className="text-sm font-black">Imagens
          <textarea className="field mt-2 min-h-24" name="imageUrls" defaultValue={imageUrls} placeholder="Uma URL por linha" required />
        </label>
        <div className="grid gap-2 rounded-lg bg-[#f7f8fa] p-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm font-bold"><input className="accent-[var(--brand)]" name="featured" type="checkbox" defaultChecked={product?.featured} /> Destaque</label>
          <label className="flex items-center gap-2 text-sm font-bold"><input className="accent-[var(--brand)]" name="bestSeller" type="checkbox" defaultChecked={product?.bestSeller} /> Mais vendido</label>
          <label className="flex items-center gap-2 text-sm font-bold"><input className="accent-[var(--brand)]" name="promotion" type="checkbox" defaultChecked={product?.promotion} /> Promoção</label>
        </div>
      </AdminFormSection>

      <AdminSubmitButton>{product ? "Salvar e fechar" : "Cadastrar produto"}</AdminSubmitButton>
    </AdminActionForm>
  );
}

function VariantForm({ productId, variant }: { productId: string; variant?: Awaited<ReturnType<typeof getProducts>>[number]["variants"][number] }) {
  return (
    <AdminActionForm
      actionName="upsertProductVariant"
      closeDetailsOnSuccess
      className="grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4"
    >
      <input type="hidden" name="productId" value={productId} />
      {variant && <input type="hidden" name="id" value={variant.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <input className="field" name="name" placeholder="Nome da variação" defaultValue={variant?.name} required />
        <input className="field" name="sku" placeholder="Código/SKU próprio" defaultValue={variant?.sku} required />
        <input className="field" name="priceAdjustment" type="number" min={0} step="0.01" placeholder="Preço extra" defaultValue={variant ? Number(variant.priceAdjustment) : ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input className="field" name="barcode" inputMode="numeric" placeholder="Código de barras" defaultValue={variant?.barcode ?? ""} />
        <input className="field" name="ean" inputMode="numeric" placeholder="EAN da variação" defaultValue={variant?.ean ?? ""} />
        <input className="field" name="internalCode" placeholder="Código interno" defaultValue={variant?.internalCode ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="field" name="costPrice" type="number" min={0} step="0.01" placeholder="Custo desta variação" defaultValue={variant?.costPrice ? Number(variant.costPrice) : ""} />
        <input className="field" name="packagingCost" type="number" min={0} step="0.01" placeholder="Embalagem desta variação" defaultValue={variant?.packagingCost ? Number(variant.packagingCost) : ""} />
      </div>
      <textarea className="field min-h-20" name="attributes" placeholder={"sabor=Chocolate\ncor=Preta\nvolume=700ml"} defaultValue={variant ? attributesToText(variant.attributes) : ""} required />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input className="field" name="stock" type="number" min={0} placeholder="Estoque" defaultValue={variant?.inventory?.quantity ?? 0} required />
        <input className="field" name="lowStockThreshold" type="number" min={0} placeholder="Mínimo" defaultValue={variant?.inventory?.lowStockThreshold ?? 5} />
        <label className="flex items-center gap-2 text-sm font-bold"><input className="accent-[var(--brand)]" name="active" type="checkbox" defaultChecked={variant?.active ?? true} /> Ativa</label>
      </div>
      <AdminSubmitButton pendingText="Salvando variação...">{variant ? "Salvar e fechar" : "Criar e fechar"}</AdminSubmitButton>
    </AdminActionForm>
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
              { barcode: { contains: q, mode: "insensitive" } },
              { ean: { contains: q, mode: "insensitive" } },
              { internalCode: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
              { variants: { some: { barcode: { contains: q, mode: "insensitive" } } } },
              { variants: { some: { ean: { contains: q, mode: "insensitive" } } } },
              { variants: { some: { internalCode: { contains: q, mode: "insensitive" } } } },
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
        <p className="admin-page-copy mt-2 text-sm">Cadastre e edite produtos com imagens, preços, estoque, status, sabores, cores e opções.</p>
      </div>

      <details className="admin-disclosure surface mb-5 overflow-hidden">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-4 font-black text-white bg-[var(--brand)] sm:px-5">
          <Plus size={18} />
          Adicionar produto
          <ChevronDown className="admin-disclosure-chevron ml-auto" size={18} />
        </summary>
        <div className="admin-edit-panel border-t border-[var(--line)] p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-black">Novo produto</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Cadastre as informações principais. Depois, adicione sabores, cores ou outras variações.</p>
          </div>
          <ProductForm categories={categories} />
        </div>
      </details>

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
              <article key={product.id} className="admin-product-card surface overflow-hidden">
                <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[76px_1fr_auto] md:items-center">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-[#eceef1]">
                    {product.images[0] && <Image src={product.images[0].url} alt={product.name} fill sizes="76px" className="object-cover" />}
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
                    <AdminActionForm actionName="archiveProduct">
                      <input type="hidden" name="id" value={product.id} />
                      <ConfirmSubmitButton message="Arquivar este produto?">Arquivar</ConfirmSubmitButton>
                    </AdminActionForm>
                  </div>
                </div>

                <details className="admin-disclosure border-t border-[var(--line)]">
                  <summary className="flex cursor-pointer items-center gap-2 px-4 py-3.5 font-black text-[var(--graphite)] sm:px-5">
                    <Pencil size={16} />
                    Editar produto
                    <ChevronDown className="admin-disclosure-chevron ml-auto text-[var(--muted)]" size={17} />
                  </summary>
                  <div className="admin-edit-panel border-t border-[var(--line)] p-4 sm:p-5">
                    <ProductForm categories={categories} product={product} />
                  </div>
                </details>

                <details className="admin-disclosure border-t border-[var(--line)]">
                  <summary className="flex cursor-pointer items-center gap-2 px-4 py-3.5 font-black text-[var(--graphite)] sm:px-5">
                    <Plus size={16} />
                    Sabores, cores e variações ({product.variants.length})
                    <ChevronDown className="admin-disclosure-chevron ml-auto text-[var(--muted)]" size={17} />
                  </summary>
                  <div className="admin-edit-panel grid gap-3 border-t border-[var(--line)] p-4 sm:p-5">
                    {product.variants.map((variant) => (
                      <div key={variant.id} className="grid gap-2">
                        <VariantForm productId={product.id} variant={variant} />
                        <AdminActionForm actionName="deactivateProductVariant" className="flex justify-end">
                          <input type="hidden" name="id" value={variant.id} />
                          <ConfirmSubmitButton message="Desativar esta variação?">Desativar variação</ConfirmSubmitButton>
                        </AdminActionForm>
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
    </div>
  );
}
