"use client";

import { useTransition } from "react";
import { ShoppingCart } from "lucide-react";
import { addToCart } from "@/lib/actions/cart";

type Props = {
  productId: string;
  variantId?: string;
  quantity?: number;
  className?: string;
};

export function AddToCartButton({ productId, variantId, quantity = 1, className = "btn btn-primary w-full" }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        const formData = new FormData();
        formData.set("productId", productId);
        if (variantId) formData.set("variantId", variantId);
        formData.set("quantity", String(quantity));
        startTransition(async () => {
          await addToCart(formData);
        });
      }}
    >
      <ShoppingCart size={18} />
      {pending ? "Adicionando..." : "Adicionar"}
    </button>
  );
}
