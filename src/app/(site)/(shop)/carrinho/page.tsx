import Link from "next/link";
import { PackageCheck, ShoppingCart, Tag } from "lucide-react";
import { CartLine } from "@/components/cart/cart-line";
import { CouponForm } from "@/components/cart/coupon-form";
import { ShippingEstimator } from "@/components/cart/shipping-estimator";
import { selectPickup } from "@/lib/actions/cart";
import { getCartForDisplay } from "@/lib/ecommerce/cart";
import { getPickupOptions } from "@/lib/shipping/quote";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Carrinho",
  description: "Revise seus produtos, calcule frete, escolha retirada na loja e siga para o checkout da XNutri.",
};

export default async function CartPage() {
  const [cart, pickupOptions] = await Promise.all([getCartForDisplay(), getPickupOptions()]);

  if (!cart.id || cart.items.length === 0) {
    return (
      <div className="container-x py-16">
        <div className="surface mx-auto max-w-xl p-8 text-center">
          <PackageCheck className="mx-auto text-[var(--brand)]" size={42} />
          <h1 className="mt-4 text-3xl font-black">Seu carrinho está vazio</h1>
          <p className="mt-3 text-[var(--muted)]">Escolha produtos da XNutri para seguir ao checkout.</p>
          <Link href="/catalogo" className="btn btn-primary mt-6">Ver produtos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x pb-28 pt-6 md:py-10">
      <div className="relative overflow-hidden rounded-lg border border-[#ffd2ca] bg-gradient-to-br from-white via-[#fff7f6] to-[#ffe7e2] p-5 text-[var(--ink)] shadow-xl md:p-8">
        <div className="absolute right-[-5rem] top-[-5rem] h-48 w-48 rounded-full bg-[var(--brand)]/12 blur-2xl" />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-[#ffc4bc] bg-white px-3 py-2 text-xs font-black uppercase text-[var(--brand-dark)]">
          <ShoppingCart size={14} className="text-[var(--brand)]" />
          Carrinho XNutri
        </span>
        <h1 className="relative mt-4 text-3xl font-black md:text-5xl">Confira seu pedido</h1>
        <p className="relative mt-2 text-sm text-[var(--muted)]">{cart.items.length} item(ns) selecionado(s) para compra online, entrega ou retirada em Mirassol.</p>
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="surface p-4 md:p-5">
          {cart.items.map((item) => <CartLine key={item.id} cartId={cart.id!} item={item} />)}
        </section>

        <aside className="space-y-5">
          <div className="surface p-5">
            <div className="flex items-center gap-2">
              <Tag size={18} />
              <h2 className="font-black">Cupom</h2>
            </div>
            <CouponForm coupon={cart.coupon ? { code: cart.coupon.code } : null} />
          </div>

          <ShippingEstimator subtotal={cart.subtotal} />

          <div className="surface p-5">
            <h2 className="font-black">Retirada na loja</h2>
            <div className="mt-3 grid gap-2">
              {pickupOptions.map((pickup) => (
                <form key={pickup.id} action={selectPickup}>
                  <input type="hidden" name="pickupLocationId" value={pickup.id} />
                  <button className="w-full rounded-md border border-[var(--line)] p-3 text-left hover:border-[var(--brand)]">
                    <strong>{pickup.name}</strong>
                    <span className="block text-sm text-[var(--muted)]">Sem cobrança de frete</span>
                  </button>
                </form>
              ))}
            </div>
          </div>

          <div className="surface p-5">
            <h2 className="text-xl font-black">Resumo</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCurrency(cart.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Frete</dt><dd>{cart.shippingCost === 0 ? "Grátis" : formatCurrency(cart.shippingCost)}</dd></div>
              <div className="flex justify-between"><dt>Desconto</dt><dd>- {formatCurrency(cart.discount)}</dd></div>
              <div className="flex justify-between border-t border-[var(--line)] pt-3 text-lg font-black"><dt>Total</dt><dd>{formatCurrency(cart.total)}</dd></div>
            </dl>
            <Link href="/checkout" className="btn btn-primary mt-5 w-full">Ir para checkout</Link>
            <Link href="/catalogo" className="btn btn-secondary mt-2 w-full">Continuar comprando</Link>
          </div>
        </aside>
      </div>

      <div className="mobile-sticky-action md:hidden">
        <div className="min-w-0">
          <span className="block text-xs font-black uppercase text-[var(--muted)]">Total do carrinho</span>
          <strong className="block truncate text-lg">{formatCurrency(cart.total)}</strong>
          <span className="mt-1 block text-[11px] font-bold text-[var(--muted)]">{cart.count} item(ns)</span>
        </div>
        <Link href="/checkout" className="btn btn-primary min-w-[156px] px-4">
          Checkout
        </Link>
      </div>
    </div>
  );
}
