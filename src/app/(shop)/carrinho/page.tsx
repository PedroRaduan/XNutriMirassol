import Link from "next/link";
import { PackageCheck, Tag } from "lucide-react";
import { CartLine } from "@/components/cart/cart-line";
import { ShippingEstimator } from "@/components/cart/shipping-estimator";
import { applyCoupon, clearCoupon, selectPickup } from "@/lib/actions/cart";
import { getCartForDisplay } from "@/lib/ecommerce/cart";
import { getPickupOptions } from "@/lib/shipping/quote";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
    <div className="container-x py-10">
      <h1 className="text-4xl font-black">Carrinho</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="surface p-5">
          {cart.items.map((item) => <CartLine key={item.id} cartId={cart.id!} item={item} />)}
        </section>

        <aside className="space-y-5">
          <div className="surface p-5">
            <div className="flex items-center gap-2">
              <Tag size={18} />
              <h2 className="font-black">Cupom</h2>
            </div>
            {cart.coupon ? (
              <form action={clearCoupon} className="mt-4 flex items-center justify-between rounded-md bg-[#fff1ef] p-3">
                <span className="font-black">{cart.coupon.code}</span>
                <button className="text-sm font-black text-red-700">Remover</button>
              </form>
            ) : (
              <form action={applyCoupon} className="mt-4 flex gap-2">
                <input className="field" name="code" placeholder="BEMVINDO10" />
                <button className="btn btn-secondary">Aplicar</button>
              </form>
            )}
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
          </div>
        </aside>
      </div>
    </div>
  );
}
