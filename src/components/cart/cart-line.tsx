import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { removeCartItem, updateCartItem } from "@/lib/actions/cart";
import { formatCurrency } from "@/lib/utils";

type CartLineProps = {
  cartId: string;
  item: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    imageUrl?: string;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  };
};

export function CartLine({ cartId, item }: CartLineProps) {
  return (
    <div className="grid gap-4 border-b border-[var(--line)] py-5 sm:grid-cols-[96px_1fr_auto]">
      <Link href={`/produto/${item.slug}`} className="relative aspect-square overflow-hidden rounded-md bg-[#f0efed]">
        {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill sizes="96px" className="object-cover" />}
      </Link>
      <div>
        <Link href={`/produto/${item.slug}`} className="font-black hover:text-[var(--brand)]">
          {item.name}
        </Link>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {item.variantName} · SKU {item.sku}
        </p>
        <p className="mt-3 font-black">{formatCurrency(item.unitPrice)}</p>
      </div>
      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
        <div className="flex items-center rounded-md border border-[var(--line)] bg-white">
          <form action={updateCartItem}>
            <input type="hidden" name="cartId" value={cartId} />
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="quantity" value={item.quantity - 1} />
            <button className="grid size-10 place-items-center" aria-label="Diminuir">
              <Minus size={16} />
            </button>
          </form>
          <span className="grid h-10 min-w-10 place-items-center text-sm font-black">{item.quantity}</span>
          <form action={updateCartItem}>
            <input type="hidden" name="cartId" value={cartId} />
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="quantity" value={item.quantity + 1} />
            <button className="grid size-10 place-items-center" aria-label="Aumentar">
              <Plus size={16} />
            </button>
          </form>
        </div>
        <strong>{formatCurrency(item.total)}</strong>
        <form action={removeCartItem}>
          <input type="hidden" name="cartId" value={cartId} />
          <input type="hidden" name="itemId" value={item.id} />
          <button className="btn btn-secondary px-3 py-2 text-red-700" aria-label="Remover">
            <Trash2 size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
