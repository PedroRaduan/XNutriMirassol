import Link from "next/link";
import { PackageCheck } from "lucide-react";
import { AddToCartButton } from "@/components/product/add-to-cart";
import { SafeImage } from "@/components/ui/safe-image";
import { getProductAvailableStock } from "@/lib/ecommerce/product-stock";
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

export function ProductCard({ product, eager = false }: { product: ProductCardProduct; eager?: boolean }) {
  const image = product.images[0];
  const firstVariant = product.variants[0];
  const stock = getProductAvailableStock(product);
  const price = toNumber(product.price);
  const compareAtPrice = product.compareAtPrice ? toNumber(product.compareAtPrice) : 0;
  const discount = compareAtPrice > price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;
  const stockLabel = stock > 0 ? (stock <= 5 ? "Poucas unidades" : "Em estoque") : "Sem estoque";
  const badges = [
    product.promotion ? (discount > 0 ? `-${discount}%` : "Promoção") : null,
    product.bestSeller ? "Mais vendido" : null,
    !product.promotion && !product.bestSeller && isRecent(product.createdAt) ? "Novo" : null,
  ].filter(Boolean);

  return (
    <article className="product-card group flex h-full flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <Link href={`/produto/${product.slug}`} className="block" aria-label={product.name}>
        <div className="product-card-media relative aspect-square overflow-hidden bg-[#f5f4f1]">
          {image ? (
            <SafeImage
              src={image.url}
              alt={image.alt}
              eager={eager}
              sizes="(max-width: 339px) 100vw, (min-width: 1280px) 25vw, 50vw"
              className="object-contain p-3 sm:p-4"
            />
          ) : (
            <div className="grid h-full place-items-center bg-[#efeeeb] text-[var(--muted)]">
              <PackageCheck size={34} />
            </div>
          )}

          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-2">
            {badges.slice(0, 1).map((badge) => (
              <span key={badge} className="badge bg-[#fff3f1] text-[var(--brand-dark)]">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-2.5 sm:gap-3 sm:p-4">
        <div className="min-h-10 sm:min-h-12">
          <Link href={`/produto/${product.slug}`} className="line-clamp-2 text-sm font-bold leading-snug text-[var(--ink)] hover:text-[var(--brand)] sm:text-base">
            {product.name}
          </Link>
        </div>

        <div className="mt-auto grid gap-1.5 sm:flex sm:items-end sm:justify-between sm:gap-3">
          <div>
            {compareAtPrice > 0 && (
              <span className="block text-xs font-semibold text-[var(--muted)] line-through">{formatCurrency(compareAtPrice)}</span>
            )}
            <strong className="text-xl leading-none tracking-tight text-[var(--ink)] sm:text-2xl">{formatCurrency(price)}</strong>
          </div>
          <span className={stock === 0 ? "stock-pill stock-pill-out" : stock > 5 ? "stock-pill" : "stock-pill stock-pill-low"}>
            {stockLabel}
          </span>
        </div>

        {stock > 0 ? (
          <div className="grid gap-1.5">
            <AddToCartButton
              productId={product.id}
              variantId={firstVariant?.id}
              idleLabel="Adicionar ao carrinho"
              addedLabel="No carrinho"
              className="btn btn-primary w-full px-2 py-2.5 text-xs"
            />
            <AddToCartButton
              productId={product.id}
              variantId={firstVariant?.id}
              idleLabel="Comprar agora"
              addedLabel="Abrindo checkout..."
              redirectTo="/checkout"
              className="btn btn-secondary w-full px-2 py-2.5 text-xs"
            />
          </div>
        ) : (
          <Link href={`/produto/${product.slug}`} className="btn btn-secondary w-full px-2 py-2.5 text-sm">
            Ver produto
          </Link>
        )}
      </div>
    </article>
  );
}
