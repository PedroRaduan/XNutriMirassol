"use client";

import { useState } from "react";
import { useTransition } from "react";
import { CheckCircle2, ShoppingCart, XCircle } from "lucide-react";
import { addToCart } from "@/lib/actions/cart";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  variantId?: string;
  quantity?: number;
  className?: string;
};

export function AddToCartButton({ productId, variantId, quantity = 1, className = "btn btn-primary w-full" }: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"idle" | "added" | "error">("idle");

  const Icon = feedback === "added" ? CheckCircle2 : feedback === "error" ? XCircle : ShoppingCart;
  const label = pending ? "Adicionando..." : feedback === "added" ? "Adicionado" : feedback === "error" ? "Tente novamente" : "Adicionar";

  return (
    <button
      type="button"
      className={cn(className, feedback === "added" && "bg-[var(--ink)] shadow-[0_14px_30px_rgb(11_11_13_/_22%)]")}
      disabled={pending}
      onClick={() => {
        setFeedback("idle");
        const formData = new FormData();
        formData.set("productId", productId);
        if (variantId) formData.set("variantId", variantId);
        formData.set("quantity", String(quantity));
        startTransition(async () => {
          try {
            await addToCart(formData);
            setFeedback("added");
            window.setTimeout(() => setFeedback("idle"), 2200);
          } catch {
            setFeedback("error");
            window.setTimeout(() => setFeedback("idle"), 2600);
          }
        });
      }}
      aria-live="polite"
    >
      <Icon size={18} />
      {label}
    </button>
  );
}
