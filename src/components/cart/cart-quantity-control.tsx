"use client";

import { LoaderCircle, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { updateCartItem } from "@/lib/actions/cart";

type CartQuantityControlProps = {
  cartId: string;
  itemId: string;
  initialQuantity: number;
  availableStock: number;
};

export function CartQuantityControl({
  cartId,
  itemId,
  initialQuantity,
  availableStock,
}: CartQuantityControlProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const quantityRef = useRef(initialQuantity);
  const committedQuantityRef = useRef(initialQuantity);
  const queuedQuantityRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    if (runningRef.current) return;

    quantityRef.current = initialQuantity;
    committedQuantityRef.current = initialQuantity;
    setQuantity(initialQuantity);
  }, [initialQuantity]);

  async function saveQueuedQuantities() {
    try {
      while (queuedQuantityRef.current !== null) {
        const nextQuantity = queuedQuantityRef.current;
        queuedQuantityRef.current = null;

        const formData = new FormData();
        formData.set("cartId", cartId);
        formData.set("itemId", itemId);
        formData.set("quantity", String(nextQuantity));

        const result = await updateCartItem(formData);
        if (!result.ok) {
          queuedQuantityRef.current = null;
          quantityRef.current = committedQuantityRef.current;
          setQuantity(committedQuantityRef.current);
          setMessage(result.message);
          return;
        }

        committedQuantityRef.current = nextQuantity;
      }

      setMessage("");
    } catch {
      queuedQuantityRef.current = null;
      quantityRef.current = committedQuantityRef.current;
      setQuantity(committedQuantityRef.current);
      setMessage("Não foi possível atualizar a quantidade. Tente novamente.");
    } finally {
      runningRef.current = false;
      router.refresh();
    }
  }

  function requestQuantity(nextQuantity: number) {
    const normalizedQuantity = Math.max(1, Math.min(nextQuantity, availableStock, 99));
    if (normalizedQuantity === quantityRef.current) return;

    quantityRef.current = normalizedQuantity;
    queuedQuantityRef.current = normalizedQuantity;
    setQuantity(normalizedQuantity);
    setMessage("");

    if (runningRef.current) return;

    runningRef.current = true;
    startTransition(saveQueuedQuantities);
  }

  return (
    <div>
      <div
        className="flex items-center rounded-md border border-[var(--line)] bg-white"
        aria-busy={isPending}
      >
        <button
          type="button"
          className="grid size-11 place-items-center disabled:cursor-not-allowed disabled:opacity-40 sm:size-10"
          aria-label="Diminuir"
          disabled={quantity <= 1}
          onClick={() => requestQuantity(quantityRef.current - 1)}
        >
          <Minus size={16} />
        </button>
        <output
          className="grid h-11 min-w-11 place-items-center text-sm font-black sm:h-10 sm:min-w-10"
          aria-label="Quantidade no carrinho"
          data-testid="cart-item-quantity"
        >
          {quantity}
        </output>
        <button
          type="button"
          className="grid size-11 place-items-center disabled:cursor-not-allowed disabled:opacity-40 sm:size-10"
          aria-label="Aumentar"
          disabled={quantity >= availableStock || quantity >= 99}
          onClick={() => requestQuantity(quantityRef.current + 1)}
        >
          <Plus size={16} />
        </button>
      </div>
      <p
        className={`mt-1 flex min-h-4 max-w-48 items-center justify-end gap-1 text-right text-xs font-bold ${message ? "text-red-700" : "text-[var(--muted)]"}`}
        aria-live="polite"
      >
        {isPending && !message ? <LoaderCircle className="animate-spin" size={12} aria-hidden="true" /> : null}
        {message || (isPending ? "Atualizando quantidade..." : "")}
      </p>
    </div>
  );
}
