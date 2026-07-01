import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PackageCheck, Sparkles } from "lucide-react";
import { AddToCartButton } from "@/components/product/add-to-cart";
import { formatCurrency, toNumber } from "@/lib/utils";

export type ProductCardProduct = {
  id: string;
  categoryId?: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description?: string;
  price: number | string | { toString(): string };
  compareAtPrice?: number | string | { toString(): string } | null;
  promotion?: boolean;
  featured?: boolean;
  bestSeller?: boolean;
  createdAt?: Date | string;
  images: Array<{ id: string; url: string; alt: string }>;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    attributes: unknown;
  }>;
  inventory?: Array<{ quantity: number; reserved: number }>;
};

function isRecent(createdAt?: Date | string) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < 1000 * 60 * 60 * 24 * 45;
}

export function ProductCard({ product }: { product: ProductCardProduct }) {
  const image = product.images[0];
  const firstVariant = product.variants[0];
  const isFallbackProduct = product.id.startsWith("fallback-");
  const stock = Math.max(product.inventory?.reduce((sum, item) => sum + item.quantity - item.reserved, 0) ?? 0, 0);
  const price = toNumber(product.price);
  const compareAtPrice = product.compareAtPrice ? toNumber(product.compareAtPrice) : 0;
  const discount = compareAtPrice > price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;
  const stockLabel = stock > 0 ? (stock <= 5 ? "Poucas unidades" : "Em estoque") : "Indisponível";
  const badges = [
    product.promotion ? (discount > 0 ? `-${discount}%` : "Promoção") : null,
    product.bestSeller ? "Mais vendido" : null,
    !product.promotion && !product.bestSeller && isRecent(product.createdAt) ? "Novo" : null,
  ].filter(Boolean);

  return (
    <article className="product-card surface reveal-card group flex h-full flex-col">
      <Link href={`/produto/${product.slug}`} className="block" aria-label={product.name}>
        <div className="product-card-media relative aspect-[4/3] overflow-hidden bg-[#eceef1]">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.08]"
            />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-[#f7f7f8] to-[#dedfe4] text-[var(--muted)]">
              <PackageCheck size={34} />
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span key={badge} className="badge border-transparent bg-[var(--brand)] text-white shadow-lg">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="min-h-[112px]">
          <Link href={`/produto/${product.slug}`} className="line-clamp-2 text-base font-black leading-snug text-[var(--ink)] hover:text-[var(--brand)] sm:text-lg">
            {product.name}
          </Link>
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--muted)] sm:mt-2 sm:text-sm">{product.shortDescription}</p>
        </div>

        <div className="mt-auto grid gap-2 sm:flex sm:items-end sm:justify-between sm:gap-3">
          <div>
            {compareAtPrice > 0 && (
              <span className="block text-xs font-semibold text-[var(--muted)] line-through">{formatCurrency(compareAtPrice)}</span>
            )}
            <strong className="text-xl text-[var(--ink)] sm:text-2xl">{formatCurrency(price)}</strong>
          </div>
          <span className={stock > 5 ? "stock-pill" : "stock-pill stock-pill-low"}>
            <Sparkles size={12} />
            {stockLabel}
          </span>
        </div>

        <div className="grid gap-2">
          {stock > 0 && firstVariant && !isFallbackProduct && (
            <AddToCartButton productId={product.id} variantId={firstVariant.id} className="btn btn-primary w-full py-2.5 sm:py-3" />
          )}
          <Link href={`/produto/${product.slug}`} className={`btn w-full py-2.5 text-sm ${stock > 0 && firstVariant && !isFallbackProduct ? "btn-secondary" : "btn-dark"}`}>
            Ver produto <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
