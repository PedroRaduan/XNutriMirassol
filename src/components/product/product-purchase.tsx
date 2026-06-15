"use client";

import { useMemo, useState } from "react";
import type { ProductVariant } from "@prisma/client";
import { AddToCartButton } from "@/components/product/add-to-cart";
import { formatCurrency, toNumber } from "@/lib/utils";

type Variant = ProductVariant & {
  inventory: { quantity: number; reserved: number } | null;
};

export function ProductPurchase({ productId, basePrice, variants }: { productId: string; basePrice: number; variants: Variant[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const selected = useMemo(() => variants.find((variant) => variant.id === variantId) ?? variants[0], [variantId, variants]);
  const available = selected?.inventory ? selected.inventory.quantity - selected.inventory.reserved : 0;
  const price = basePrice + toNumber(selected?.priceAdjustment ?? 0);

  return (
    <div className="surface space-y-5 p-5">
      <div>
        <label className="text-sm font-black">Variação</label>
        <select className="field mt-2" value={variantId} onChange={(event) => setVariantId(event.target.value)}>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.name} · {variant.sku}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-black">
          Quantidade
          <input
            className="field mt-2"
            type="number"
            min={1}
            max={Math.max(available, 1)}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
        <div className="rounded-md border border-[var(--line)] bg-[#f9faf7] p-3">
          <span className="block text-xs font-bold text-[var(--muted)]">Disponível</span>
          <strong>{available} unidades</strong>
        </div>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase text-[var(--muted)]">Preço</span>
          <strong className="block text-3xl">{formatCurrency(price)}</strong>
        </div>
        {available > 0 && selected ? (
          <AddToCartButton productId={productId} variantId={selected.id} quantity={quantity} className="btn btn-primary min-w-40" />
        ) : (
          <span className="btn btn-secondary min-w-40">Indisponível</span>
        )}
      </div>
    </div>
  );
}
