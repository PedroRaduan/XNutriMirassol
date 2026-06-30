import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, ShieldCheck, Store, Truck } from "lucide-react";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ProductCard } from "@/components/product/product-card";
import { prisma } from "@/lib/db/prisma";
import { fallbackProducts, getStorefrontCategory } from "@/lib/fallback/catalog";
import { formatCurrency, getBaseUrl, toNumber } from "@/lib/utils";
import { getWhatsAppHref } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  }).catch(() => fallbackProducts.find((item) => item.slug === slug));

  if (!product) return {};

  return {
    title: "metaTitle" in product && product.metaTitle ? product.metaTitle : product.name,
    description: "metaDescription" in product && product.metaDescription ? product.metaDescription : product.shortDescription,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: product.images[0]?.url ? [{ url: product.images[0].url }] : undefined,
      type: "website",
    },
    alternates: {
      canonical: `/produto/${product.slug}`,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { active: true }, include: { inventory: true } },
      reviews: { where: { approved: true }, orderBy: { createdAt: "desc" }, take: 8 },
    },
  }).catch(() => fallbackProducts.find((item) => item.slug === slug));

  if (!product || product.status !== "ACTIVE") notFound();

  const related = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { take: 1 }, inventory: true },
    take: 4,
  }).catch(() => fallbackProducts.filter((item) => item.categoryId === product.categoryId && item.id !== product.id).slice(0, 4));

  const stock = product.variants.reduce((sum, variant) => {
    return sum + Math.max((variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0), 0);
  }, 0);
  const purchaseVariants = product.variants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    priceAdjustment: toNumber(variant.priceAdjustment),
    inventory: variant.inventory
      ? {
          quantity: variant.inventory.quantity,
          reserved: variant.inventory.reserved,
        }
      : null,
  }));
  const storefrontCategory = getStorefrontCategory(product.category);
  const stockLabel = stock > 0 ? (stock <= 5 ? "Poucas unidades" : "Em estoque") : "Indisponível";
  const isSupplement = storefrontCategory.slug === "suplementos";
  const productGuides = isSupplement
    ? [
        { title: "Benefícios", body: "Produto selecionado para apoiar rotina de treino, recuperação e consistência alimentar conforme seus objetivos." },
        { title: "Sugestão de uso", body: "Siga sempre a orientação do rótulo. Em caso de dúvidas, fale com a equipe da XNutri pelo WhatsApp antes de comprar." },
        { title: "Cuidados", body: "Mantenha o produto fechado, em local seco e arejado. Suplementos não substituem alimentação equilibrada." },
      ]
    : [
        { title: "Conforto no treino", body: "Peça pensada para mobilidade, rotina de academia e uso esportivo no dia a dia." },
        { title: "Cuidados de conservação", body: "Lave conforme a etiqueta do produto e evite secagem em alta temperatura para preservar tecido e acabamento." },
        { title: "Trocas", body: "Se precisar de ajuda após a compra, fale com a equipe pelo WhatsApp informando o número do pedido." },
      ];
  const whatsappHref = getWhatsAppHref(
    undefined,
    `Olá! Vim pelo site da XNutri e tenho interesse no produto: ${product.name}.`,
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    image: product.images.map((image) => image.url),
    description: product.shortDescription,
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: toNumber(product.price).toFixed(2),
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${getBaseUrl()}/produto/${product.slug}`,
    },
    aggregateRating:
      product.reviews.length > 0
        ? {
            "@type": "AggregateRating",
            ratingValue:
              product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length,
            reviewCount: product.reviews.length,
          }
        : undefined,
  };

  return (
    <div className="container-x py-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="text-sm font-semibold text-[var(--muted)]">
        <Link href="/catalogo" className="hover:text-[var(--brand)]">Catálogo</Link> /{" "}
        <Link href={`/catalogo?category=${storefrontCategory.slug}`} className="hover:text-[var(--brand)]">{storefrontCategory.name}</Link>
      </nav>

      <section className="mt-4 grid gap-6 md:mt-6 lg:grid-cols-[1fr_480px] lg:gap-10">
        <ProductGallery images={product.images} />
        <div className="space-y-6">
          <div>
            <span className="badge">{storefrontCategory.name}</span>
            <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl">{product.name}</h1>
            <p className="mt-3 text-base leading-7 text-[var(--muted)] md:mt-4 md:text-lg md:leading-8">{product.shortDescription}</p>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              {product.compareAtPrice && <span className="text-lg text-[var(--muted)] line-through">{formatCurrency(product.compareAtPrice)}</span>}
              <strong className="text-3xl md:text-4xl">{formatCurrency(product.price)}</strong>
              <span className="badge">{stockLabel}</span>
            </div>
          </div>

          <ProductPurchase productId={product.id} basePrice={toNumber(product.price)} variants={purchaseVariants} />

          <div className="grid gap-3 sm:grid-cols-2">
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn btn-secondary w-full">
              <MessageCircle size={18} />
              Tirar dúvida no WhatsApp
            </a>
            <Link href="/retirada-na-loja" className="btn btn-secondary w-full">
              <Store size={18} />
              Retirada em Mirassol
            </Link>
          </div>

          <div className="surface grid gap-3 p-4 text-sm font-semibold text-[var(--muted)] sm:grid-cols-3">
            <span className="inline-flex items-center gap-2"><Store size={17} className="text-[var(--brand)]" /> Retirada disponível</span>
            <span className="inline-flex items-center gap-2"><Truck size={17} className="text-[var(--brand)]" /> Entrega regional</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={17} className="text-[var(--brand)]" /> Compra protegida</span>
          </div>

          <div className="surface p-5">
            <h2 className="text-xl font-black">Descrição</h2>
            <p className="mt-3 leading-7 text-[var(--muted)]">{product.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="font-black">SKU</dt><dd className="text-[var(--muted)]">{product.sku}</dd></div>
              <div><dt className="font-black">Peso</dt><dd className="text-[var(--muted)]">{product.weightGrams}g</dd></div>
              <div><dt className="font-black">Dimensões</dt><dd className="text-[var(--muted)]">{product.widthCm} x {product.heightCm} x {product.lengthCm} cm</dd></div>
              <div><dt className="font-black">Marca</dt><dd className="text-[var(--muted)]">{product.brand}</dd></div>
            </dl>
          </div>

          <div className="grid gap-3">
            {productGuides.map((guide) => (
              <div key={guide.title} className="surface p-4">
                <h2 className="font-black">{guide.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{guide.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10 md:mt-14">
        <h2 className="text-2xl font-black md:text-3xl">Avaliações</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {product.reviews.map((review) => (
            <article key={review.id} className="surface p-5">
              <div className="text-[var(--accent)]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
              <h3 className="mt-3 font-black">{review.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{review.comment}</p>
            </article>
          ))}
          {product.reviews.length === 0 && (
            <div className="surface p-5 text-sm leading-6 text-[var(--muted)] md:col-span-3">
              Este produto ainda não tem avaliações publicadas. Se quiser, fale com a equipe da XNutri pelo WhatsApp para tirar dúvidas antes de comprar.
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-10 md:mt-14">
          <h2 className="text-2xl font-black md:text-3xl">Produtos relacionados</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}
