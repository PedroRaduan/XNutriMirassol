import Link from "next/link";
import { PackageCheck } from "lucide-react";
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
          <h1 className="mt-4 text-3xl font-bold">Seu carrinho está vazio</h1>
          <p className="mt-3 text-[var(--muted)]">Escolha produtos da XNutri para seguir ao checkout.</p>
          <Link href="/catalogo" className="btn btn-primary mt-6">Ver produtos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x pb-28 pt-8 md:py-10">
      <div className="border-b border-[var(--line)] pb-6">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Seu carrinho</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Revise os produtos e escolha entrega ou retirada em Mirassol.</p>
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="surface p-4 md:p-5">
          {cart.items.map((item) => <CartLine key={item.id} cartId={cart.id!} item={item} />)}
        </section>

        <aside className="space-y-5">
          <div className="surface p-5">
            <h2 className="font-bold">Cupom</h2>
            <CouponForm coupon={cart.coupon ? { code: cart.coupon.code } : null} />
          </div>

          <ShippingEstimator subtotal={cart.subtotal} />

          <div className="surface p-5">
            <h2 className="font-bold">Retirada na loja</h2>
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
            <h2 className="text-xl font-bold">Resumo</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCurrency(cart.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Frete</dt><dd>{cart.shippingCost === 0 ? "Grátis" : formatCurrency(cart.shippingCost)}</dd></div>
              <div className="flex justify-between"><dt>Desconto</dt><dd>- {formatCurrency(cart.discount)}</dd></div>
              <div className="flex justify-between border-t border-[var(--line)] pt-3 text-lg font-bold"><dt>Total</dt><dd>{formatCurrency(cart.total)}</dd></div>
            </dl>
            <Link href="/checkout" className="btn btn-primary mt-5 w-full">Ir para checkout</Link>
            <Link href="/catalogo" className="btn btn-secondary mt-2 w-full">Continuar comprando</Link>
          </div>
        </aside>
      </div>

      <div className="mobile-sticky-action md:hidden">
        <div className="min-w-0">
          <span className="block text-xs font-semibold uppercase text-[var(--muted)]">Total do carrinho</span>
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
