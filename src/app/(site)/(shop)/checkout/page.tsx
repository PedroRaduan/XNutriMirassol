import Link from "next/link";
import { LockKeyhole, PackageCheck, ShieldCheck, Store } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartForDisplay } from "@/lib/ecommerce/cart";
import { getPickupOptions } from "@/lib/shipping/quote";
import { isPagBankCheckoutEnabled } from "@/lib/payments/config";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout",
  description: "Finalize seu pedido na XNutri com entrega, retirada em Mirassol, PIX ou cartão pelo PagBank.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [cart, pickupOptions, user] = await Promise.all([getCartForDisplay(), getPickupOptions(), getCurrentUser()]);
  const pagBankCheckoutEnabled = isPagBankCheckoutEnabled();

  if (!cart.id || cart.items.length === 0) {
    return (
      <div className="container-x py-16">
        <div className="surface mx-auto max-w-xl p-8 text-center">
          <PackageCheck className="mx-auto text-[var(--brand)]" size={44} />
          <h1 className="mt-4 text-3xl font-bold">Carrinho vazio</h1>
          <p className="mt-3 text-[var(--muted)]">Escolha seus produtos para iniciar um checkout seguro.</p>
          <Link href="/catalogo" className="btn btn-primary mt-6">Escolher produtos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8 md:py-10">
      <div className="border-b border-[var(--line)] pb-6 md:pb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-sm font-semibold text-[var(--brand)]">Checkout seguro</span>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">Finalize seu pedido</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">Escolha entrega ou retirada na loja, confirme seus dados e pague via PagBank.</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[var(--muted)]">
            <span>1. Dados</span>
            <span>2. Entrega</span>
            <span>3. Pagamento</span>
          </div>
        </div>
      </div>

      {!user && (
        <div className="mt-5 rounded-lg border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">
          Você pode finalizar como visitante ou <Link href="/login" className="font-semibold text-[var(--brand)]">entrar na sua conta</Link>.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <CheckoutForm
          pagBankCheckoutEnabled={pagBankCheckoutEnabled}
          shippingMethodId={cart.shippingMethod?.id}
          shippingZipCode={cart.shippingZipCode}
          pickupLocationId={cart.pickupLocation?.id}
          pickupOptions={pickupOptions.map((pickup) => ({ id: pickup.id, name: pickup.name, instructions: pickup.instructions }))}
          subtotal={cart.subtotal}
          total={cart.total}
          shippingMethodName={cart.shippingMethod?.name}
          shippingCost={cart.shippingCost}
        />

        <aside className="order-first self-start lg:sticky lg:top-28 lg:order-none">
          <div className="surface overflow-hidden">
            <div className="border-b border-[var(--line)] p-5">
              <h2 className="text-xl font-bold">Resumo do pedido</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{cart.items.length} item(ns) no carrinho</p>
            </div>
            <div className="p-5">
              <div className="grid gap-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-[var(--muted)]">{item.quantity}x {item.name}</span>
                    <strong>{formatCurrency(item.total)}</strong>
                  </div>
                ))}
              </div>
              <dl className="mt-5 grid gap-3 border-t border-[var(--line)] pt-4 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCurrency(cart.subtotal)}</dd></div>
                <div className="flex justify-between"><dt>Frete</dt><dd>{cart.shippingCost === 0 ? "Grátis" : formatCurrency(cart.shippingCost)}</dd></div>
                <div className="flex justify-between"><dt>Desconto</dt><dd>- {formatCurrency(cart.discount)}</dd></div>
                <div className="flex justify-between rounded-lg bg-[#f7f6f4] p-3 text-xl font-bold"><dt>Total</dt><dd>{formatCurrency(cart.total)}</dd></div>
              </dl>
            </div>
          </div>

          <div className="surface mt-4 p-5">
            <div className="flex items-center gap-2 text-[var(--brand)]">
              <Store size={20} />
              <h3 className="font-bold text-[var(--ink)]">Retirada na loja</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Se escolher retirada, o frete fica zerado e o pedido gera protocolo para apresentar na XNutri Mirassol.
            </p>
            <p className="mt-3 rounded-md bg-[#fff7f6] p-3 text-sm font-semibold leading-6 text-[var(--brand-dark)]">
              Após finalizar, você poderá confirmar detalhes do pedido pelo WhatsApp se precisar.
            </p>
          </div>

          <div className="mt-4 grid gap-2 text-xs font-bold text-[var(--muted)]">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-[var(--brand)]" /> {pagBankCheckoutEnabled ? "Pagamento processado com PagBank" : "Pagamento online em configuração"}</span>
            <span className="inline-flex items-center gap-2"><LockKeyhole size={15} className="text-[var(--brand)]" /> Dados validados antes do pedido</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
