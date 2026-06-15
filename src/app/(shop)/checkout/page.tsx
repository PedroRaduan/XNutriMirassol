import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartForDisplay } from "@/lib/ecommerce/cart";
import { getPickupOptions } from "@/lib/shipping/quote";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [cart, pickupOptions, user] = await Promise.all([getCartForDisplay(), getPickupOptions(), getCurrentUser()]);

  if (!cart.id || cart.items.length === 0) {
    return (
      <div className="container-x py-16">
        <div className="surface mx-auto max-w-xl p-8 text-center">
          <h1 className="text-3xl font-black">Carrinho vazio</h1>
          <Link href="/catalogo" className="btn btn-primary mt-6">Escolher produtos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl font-black">Checkout</h1>
      {!user && (
        <div className="mt-4 rounded-md border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">
          Você pode finalizar como visitante ou <Link href="/login" className="font-black text-[var(--brand)]">entrar na sua conta</Link>.
        </div>
      )}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <CheckoutForm
          shippingMethodId={cart.shippingMethod?.id}
          pickupLocationId={cart.pickupLocation?.id}
          pickupOptions={pickupOptions.map((pickup) => ({ id: pickup.id, name: pickup.name, instructions: pickup.instructions }))}
        />
        <aside className="surface self-start p-5">
          <h2 className="text-xl font-black">Resumo do pedido</h2>
          <div className="mt-4 grid gap-3">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <span>{item.quantity}x {item.name}</span>
                <strong>{formatCurrency(item.total)}</strong>
              </div>
            ))}
          </div>
          <dl className="mt-5 grid gap-3 border-t border-[var(--line)] pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCurrency(cart.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Frete</dt><dd>{cart.shippingCost === 0 ? "Grátis" : formatCurrency(cart.shippingCost)}</dd></div>
            <div className="flex justify-between"><dt>Desconto</dt><dd>- {formatCurrency(cart.discount)}</dd></div>
            <div className="flex justify-between text-lg font-black"><dt>Total</dt><dd>{formatCurrency(cart.total)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
