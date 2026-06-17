import Link from "next/link";
import { CheckCircle2, LockKeyhole, PackageCheck, ShieldCheck, Store } from "lucide-react";
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
          <PackageCheck className="mx-auto text-[var(--brand)]" size={44} />
          <h1 className="mt-4 text-3xl font-black">Carrinho vazio</h1>
          <p className="mt-3 text-[var(--muted)]">Escolha seus produtos para iniciar um checkout seguro.</p>
          <Link href="/catalogo" className="btn btn-primary mt-6">Escolher produtos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-6 md:py-10">
      <div className="rounded-lg bg-[var(--ink)] p-5 text-white shadow-2xl md:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-black uppercase text-white/80">
          <LockKeyhole size={14} className="text-[#ffd2cc]" />
          Checkout seguro XNutri
        </span>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black md:text-5xl">Finalize seu pedido</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 md:text-base">Escolha entrega ou retirada na loja, confirme seus dados e pague via Mercado Pago.</p>
          </div>
          <div className="grid gap-2 text-sm text-white/70 sm:grid-cols-3 md:min-w-[420px]">
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[var(--brand)]" /> Dados</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[var(--brand)]" /> Entrega</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[var(--brand)]" /> Pagamento</span>
          </div>
        </div>
      </div>

      {!user && (
        <div className="mt-5 rounded-lg border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)] shadow-sm">
          Voce pode finalizar como visitante ou <Link href="/login" className="font-black text-[var(--brand)]">entrar na sua conta</Link>.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <CheckoutForm
          shippingMethodId={cart.shippingMethod?.id}
          pickupLocationId={cart.pickupLocation?.id}
          pickupOptions={pickupOptions.map((pickup) => ({ id: pickup.id, name: pickup.name, instructions: pickup.instructions }))}
        />

        <aside className="order-first self-start lg:sticky lg:top-28 lg:order-none">
          <div className="surface overflow-hidden">
            <div className="bg-gradient-to-r from-[var(--brand-dark)] to-[var(--brand)] p-5 text-white">
              <h2 className="text-xl font-black">Resumo do pedido</h2>
              <p className="mt-1 text-sm text-white/70">{cart.items.length} item(ns) no carrinho</p>
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
                <div className="flex justify-between"><dt>Frete</dt><dd>{cart.shippingCost === 0 ? "Gratis" : formatCurrency(cart.shippingCost)}</dd></div>
                <div className="flex justify-between"><dt>Desconto</dt><dd>- {formatCurrency(cart.discount)}</dd></div>
                <div className="flex justify-between rounded-lg bg-[#f7f7f8] p-3 text-xl font-black"><dt>Total</dt><dd>{formatCurrency(cart.total)}</dd></div>
              </dl>
            </div>
          </div>

          <div className="surface mt-4 p-5">
            <div className="flex items-center gap-2 text-[var(--brand)]">
              <Store size={20} />
              <h3 className="font-black text-[var(--ink)]">Retirada na loja</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Se escolher retirada, o frete fica zerado e o pedido gera protocolo para apresentar na XNutri Mirassol.
            </p>
          </div>

          <div className="mt-4 grid gap-2 text-xs font-bold text-[var(--muted)]">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-[var(--brand)]" /> Pagamento processado com Mercado Pago</span>
            <span className="inline-flex items-center gap-2"><LockKeyhole size={15} className="text-[var(--brand)]" /> Dados validados antes do pedido</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
