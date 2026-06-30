"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Store } from "lucide-react";
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
  const [showSticky, setShowSticky] = useState(false);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => variants.find((variant) => variant.id === variantId) ?? variants[0], [variantId, variants]);
  const available = Math.max((selected?.inventory?.quantity ?? 0) - (selected?.inventory?.reserved ?? 0), 0);
  const maxQuantity = Math.max(available, 1);
  const unitPrice = basePrice + toNumber(selected?.priceAdjustment ?? 0);
  const itemTotal = unitPrice * quantity;

  function setSafeQuantity(value: number) {
    if (!Number.isFinite(value)) {
      setQuantity(1);
      return;
    }

    setQuantity(Math.max(1, Math.min(Math.trunc(value), maxQuantity)));
  }

  useEffect(() => {
    function updateSticky() {
      const node = purchaseRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const visible = rect.bottom > 96 && rect.top < window.innerHeight - 96;
      setShowSticky(window.scrollY > 260 && !visible);
    }

    updateSticky();
    window.addEventListener("scroll", updateSticky, { passive: true });
    window.addEventListener("resize", updateSticky);
    return () => {
      window.removeEventListener("scroll", updateSticky);
      window.removeEventListener("resize", updateSticky);
    };
  }, []);

  const addButton =
    available > 0 && selected ? (
      <div className="grid w-full gap-2 sm:w-auto sm:min-w-48">
        <AddToCartButton productId={productId} variantId={selected.id} quantity={quantity} className="btn btn-primary w-full" />
        <AddToCartButton
          productId={productId}
          variantId={selected.id}
          quantity={quantity}
          className="btn btn-secondary w-full"
          idleLabel="Comprar agora"
          addedLabel="Indo ao checkout..."
          redirectTo="/checkout"
        />
      </div>
    ) : (
      <span className="btn btn-secondary w-full sm:min-w-40 sm:w-auto">Indisponível</span>
    );

  return (
    <div className="space-y-3 pb-24 md:pb-0">
      <div ref={purchaseRef} className="surface space-y-4 p-4 md:space-y-5 md:p-5">
        <div>
          <label className="text-sm font-black">Opção</label>
          <select
            className="field mt-2"
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setQuantity(1);
            }}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name} - {variant.sku}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-black">
            Quantidade
            <span className="mt-2 grid min-h-12 grid-cols-[48px_1fr_48px] overflow-hidden rounded-lg border border-[var(--line)] bg-white">
              <button
                className="grid place-items-center border-r border-[var(--line)] disabled:opacity-35"
                type="button"
                aria-label="Diminuir quantidade"
                disabled={quantity <= 1}
                onClick={() => setSafeQuantity(quantity - 1)}
              >
                <Minus size={17} />
              </button>
              <input
                className="w-full border-0 bg-white text-center text-base font-black outline-none"
                type="number"
                min={1}
                max={maxQuantity}
                inputMode="numeric"
                value={quantity}
                onChange={(event) => setSafeQuantity(Number(event.target.value))}
              />
              <button
                className="grid place-items-center border-l border-[var(--line)] disabled:opacity-35"
                type="button"
                aria-label="Aumentar quantidade"
                disabled={quantity >= maxQuantity}
                onClick={() => setSafeQuantity(quantity + 1)}
              >
                <Plus size={17} />
              </button>
            </span>
          </label>
          <div className="rounded-md border border-[var(--line)] bg-[#f9faf7] p-3">
            <span className="block text-xs font-bold text-[var(--muted)]">Disponível</span>
            <strong>{available} unidades</strong>
            {available <= 5 && available > 0 && <span className="mt-1 block text-xs font-bold text-[var(--brand-dark)]">Últimas unidades</span>}
          </div>
        </div>

        <div className="grid gap-3 sm:flex sm:items-end sm:justify-between sm:gap-4">
          <div>
            <span className="text-xs font-bold uppercase text-[var(--muted)]">Preço</span>
            <strong className="block text-3xl">{formatCurrency(unitPrice)}</strong>
            <span className="mt-1 block text-xs font-semibold text-[var(--muted)]">Total do item: {formatCurrency(itemTotal)}</span>
          </div>
          {addButton}
        </div>
      </div>

      {showSticky && (
      <div className="mobile-sticky-action md:hidden">
        <div className="min-w-0">
          <span className="block text-xs font-black uppercase text-[var(--muted)]">Total do item</span>
          <strong className="block truncate text-lg">{formatCurrency(itemTotal)}</strong>
          <span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[var(--muted)]">
            <Store size={13} className="text-[var(--brand)]" />
            Retirada disponível
          </span>
        </div>
        {available > 0 && selected ? (
          <AddToCartButton
            productId={productId}
            variantId={selected.id}
            quantity={quantity}
            className="btn btn-primary min-w-[148px] px-4"
            idleLabel="Comprar agora"
            addedLabel="Indo ao checkout..."
            redirectTo="/checkout"
          />
        ) : (
          <span className="btn btn-secondary min-w-[148px]">Indisponível</span>
        )}
      </div>
      )}
    </div>
  );
}
