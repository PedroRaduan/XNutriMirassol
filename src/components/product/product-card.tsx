import Image from "next/image";
import Link from "next/link";
import type { Product, ProductImage, ProductVariant } from "@prisma/client";
import { AddToCartButton } from "@/components/product/add-to-cart";
import { formatCurrency, toNumber } from "@/lib/utils";

type ProductWithRelations = Product & {
  images: ProductImage[];
  variants: ProductVariant[];
  inventory?: Array<{ quantity: number; reserved: number }>;
};

export function ProductCard({ product }: { product: ProductWithRelations }) {
  const image = product.images[0];
  const firstVariant = product.variants[0];
  const stock = product.inventory?.reduce((sum, item) => sum + item.quantity - item.reserved, 0) ?? 0;
  const sizeOptions = product.variants
    .map((variant) => {
      const attributes = variant.attributes as Record<string, unknown>;
      return typeof attributes.tamanho === "string" ? attributes.tamanho : null;
    })
    .filter(Boolean)
    .slice(0, 6);

  return (
    <article className="surface overflow-hidden">
      <Link href={`/produto/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-[#f0efed]">
          {image && (
            <Image
              src={image.url}
              alt={image.alt}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          )}
          {product.promotion && (
            <span className="badge absolute left-3 top-3 border-transparent bg-[var(--brand)] text-white">
              Promo
            </span>
          )}
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="min-h-24">
          <Link href={`/produto/${product.slug}`} className="font-black leading-snug hover:text-[var(--brand)]">
            {product.name}
          </Link>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--muted)]">{product.shortDescription}</p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            {product.compareAtPrice && (
              <span className="block text-xs text-[var(--muted)] line-through">{formatCurrency(product.compareAtPrice)}</span>
            )}
            <strong className="text-xl">{formatCurrency(product.price)}</strong>
          </div>
          <span className="text-xs font-bold text-[var(--muted)]">
            {stock > 0 ? `${stock} em estoque` : "Indisponivel"}
          </span>
        </div>
        {sizeOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sizeOptions.map((size) => (
              <span
                key={size}
                className="grid min-w-8 place-items-center rounded border border-[var(--line)] bg-white px-2 py-1 text-xs font-black"
              >
                {size}
              </span>
            ))}
          </div>
        )}
        {stock > 0 && firstVariant ? (
          <AddToCartButton productId={product.id} variantId={firstVariant.id} className="btn btn-primary w-full py-3" />
        ) : (
          <Link href={`/produto/${product.slug}`} className="btn btn-secondary w-full">
            Ver produto
          </Link>
        )}
        <span className="block text-xs font-semibold text-[var(--muted)]">
          SKU {product.sku} - {formatCurrency(toNumber(product.price))}
        </span>
      </div>
    </article>
  );
}
