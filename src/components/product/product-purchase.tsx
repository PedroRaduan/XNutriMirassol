"use client";

import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/product/add-to-cart";
import { formatCurrency, toNumber } from "@/lib/utils";

type Variant = {
  id: string;
  name: string;
  sku: string;
  priceAdjustment?: number | string | { toString(): string };
  inventory: { quantity: number; reserved: number } | null;
};

export function ProductPurchase({ productId, basePrice, variants }: { productId: string; basePrice: number; variants: Variant[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const selected = useMemo(() => variants.find((variant) => variant.id === variantId) ?? variants[0], [variantId, variants]);
  const available = selected?.inventory ? selected.inventory.quantity - selected.inventory.reserved : 0;
  const price = basePrice + toNumber(selected?.priceAdjustment ?? 0);
  const isFallbackProduct = productId.startsWith("fallback-");

  return (
    <div className="surface space-y-4 p-4 md:space-y-5 md:p-5">
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
      <div className="grid gap-3 sm:flex sm:items-end sm:justify-between sm:gap-4">
        <div>
          <span className="text-xs font-bold uppercase text-[var(--muted)]">Preço</span>
          <strong className="block text-3xl">{formatCurrency(price)}</strong>
        </div>
        {available > 0 && selected && !isFallbackProduct ? (
          <AddToCartButton productId={productId} variantId={selected.id} quantity={quantity} className="btn btn-primary w-full sm:min-w-40 sm:w-auto" />
        ) : (
          <span className="btn btn-secondary w-full sm:min-w-40 sm:w-auto">{isFallbackProduct ? "Banco pendente" : "Indisponível"}</span>
        )}
      </div>
    </div>
  );
}
