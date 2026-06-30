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
  idleLabel?: string;
  addedLabel?: string;
  redirectTo?: string;
};

export function AddToCartButton({
  productId,
  variantId,
  quantity = 1,
  className = "btn btn-primary w-full",
  idleLabel = "Adicionar ao carrinho",
  addedLabel = "Adicionado",
  redirectTo,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"idle" | "added" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const Icon = feedback === "added" ? CheckCircle2 : feedback === "error" ? XCircle : ShoppingCart;
  const errorLabel = errorMessage.toLowerCase().includes("estoque") ? "Sem estoque" : "Tente novamente";
  const label = pending ? "Adicionando..." : feedback === "added" ? addedLabel : feedback === "error" ? errorLabel : idleLabel;

  return (
    <button
      type="button"
      className={cn(className, feedback === "added" && "bg-[var(--ink)] shadow-[0_14px_30px_rgb(11_11_13_/_22%)]")}
      disabled={pending}
      title={feedback === "error" ? errorMessage : undefined}
      onClick={() => {
        setFeedback("idle");
        setErrorMessage("");
        const formData = new FormData();
        formData.set("productId", productId);
        if (variantId) formData.set("variantId", variantId);
        formData.set("quantity", String(quantity));
        startTransition(async () => {
          const result = await addToCart(formData);

          if (result.ok) {
            setFeedback("added");
            if (redirectTo) {
              window.location.href = redirectTo;
              return;
            }
            window.setTimeout(() => setFeedback("idle"), 2200);
            return;
          }

          setFeedback("error");
          setErrorMessage(result.message);
          window.setTimeout(() => setFeedback("idle"), 2600);
        });
      }}
      aria-live="polite"
    >
      <Icon size={18} />
      {label}
    </button>
  );
}
