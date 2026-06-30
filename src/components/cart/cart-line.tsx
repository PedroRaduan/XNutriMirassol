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
    availableStock: number;
  };
};

export function CartLine({ cartId, item }: CartLineProps) {
  const canIncrease = item.quantity < item.availableStock;

  return (
    <div className="grid grid-cols-[82px_1fr] gap-3 border-b border-[var(--line)] py-4 sm:grid-cols-[96px_1fr_auto] sm:gap-4 sm:py-5">
      <Link href={`/produto/${item.slug}`} className="relative aspect-square overflow-hidden rounded-md bg-[#f0efed]">
        {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill sizes="96px" className="object-cover" />}
      </Link>
      <div className="min-w-0">
        <Link href={`/produto/${item.slug}`} className="line-clamp-2 font-black leading-snug hover:text-[var(--brand)]">
          {item.name}
        </Link>
        <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)] sm:text-sm">
          {item.variantName} · <span className="hidden sm:inline">SKU {item.sku}</span>
        </p>
        <p className="mt-2 font-black sm:mt-3">{formatCurrency(item.unitPrice)}</p>
        <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{item.availableStock} em estoque</p>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end">
        <div className="flex items-center rounded-md border border-[var(--line)] bg-white">
          <form action={updateCartItem}>
            <input type="hidden" name="cartId" value={cartId} />
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="quantity" value={item.quantity - 1} />
            <button className="grid size-11 place-items-center sm:size-10" aria-label="Diminuir">
              <Minus size={16} />
            </button>
          </form>
          <span className="grid h-11 min-w-11 place-items-center text-sm font-black sm:h-10 sm:min-w-10">{item.quantity}</span>
          <form action={updateCartItem}>
            <input type="hidden" name="cartId" value={cartId} />
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="quantity" value={item.quantity + 1} />
            <button className="grid size-11 place-items-center disabled:cursor-not-allowed disabled:opacity-40 sm:size-10" aria-label="Aumentar" disabled={!canIncrease}>
              <Plus size={16} />
            </button>
          </form>
        </div>
        <div className="ml-auto text-right sm:ml-0">
          <strong>{formatCurrency(item.total)}</strong>
          {!canIncrease && <span className="mt-1 block text-[11px] font-bold text-[var(--brand-dark)]">Limite do estoque</span>}
        </div>
        <form action={removeCartItem}>
          <input type="hidden" name="cartId" value={cartId} />
          <input type="hidden" name="itemId" value={item.id} />
          <button className="btn btn-secondary min-h-11 px-3 py-2 text-red-700" aria-label="Remover">
            <Trash2 size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
