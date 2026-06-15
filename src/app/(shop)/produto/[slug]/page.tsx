import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ProductCard } from "@/components/product/product-card";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, getBaseUrl, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  if (!product) return {};

  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription,
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
  });

  if (!product || product.status !== "ACTIVE") notFound();

  const related = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { take: 1 }, inventory: true },
    take: 4,
  });

  const stock = product.variants.reduce((sum, variant) => {
    return sum + Math.max((variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0), 0);
  }, 0);
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
    <div className="container-x py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="text-sm font-semibold text-[var(--muted)]">
        <Link href="/catalogo" className="hover:text-[var(--brand)]">Catálogo</Link> /{" "}
        <Link href={`/catalogo?category=${product.category.slug}`} className="hover:text-[var(--brand)]">{product.category.name}</Link>
      </nav>

      <section className="mt-6 grid gap-10 lg:grid-cols-[1fr_480px]">
        <ProductGallery images={product.images} />
        <div className="space-y-6">
          <div>
            <span className="badge">{product.category.name}</span>
            <h1 className="mt-4 text-4xl font-black leading-tight">{product.name}</h1>
            <p className="mt-4 text-lg leading-8 text-[var(--muted)]">{product.shortDescription}</p>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              {product.compareAtPrice && <span className="text-lg text-[var(--muted)] line-through">{formatCurrency(product.compareAtPrice)}</span>}
              <strong className="text-4xl">{formatCurrency(product.price)}</strong>
              <span className="badge">{stock} em estoque</span>
            </div>
          </div>

          <ProductPurchase productId={product.id} basePrice={toNumber(product.price)} variants={product.variants} />

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
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-black">Avaliações</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {product.reviews.map((review) => (
            <article key={review.id} className="surface p-5">
              <div className="text-[var(--accent)]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
              <h3 className="mt-3 font-black">{review.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{review.comment}</p>
            </article>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-3xl font-black">Produtos relacionados</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}
