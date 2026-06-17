"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CreditCard, MapPin, QrCode, ShieldCheck, Store, Truck, UserRound, type LucideIcon } from "lucide-react";
import { submitCheckout } from "@/lib/actions/checkout";
import { checkoutSchema } from "@/lib/validations";

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

type CheckoutFormProps = {
  shippingMethodId?: string | null;
  pickupLocationId?: string | null;
  pickupOptions: Array<{ id: string; name: string; instructions: string }>;
};

function StepTitle({ number, title, text, icon: Icon }: { number: string; title: string; text: string; icon: LucideIcon }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--ink)] text-sm font-black text-white">{number}</span>
      <div>
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-[var(--brand)]" />
          <h2 className="text-lg font-black">{title}</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{text}</p>
      </div>
    </div>
  );
}

export function CheckoutForm({ shippingMethodId, pickupLocationId, pickupOptions }: CheckoutFormProps) {
  const [shippingType, setShippingType] = useState<CheckoutFormValues["shippingType"]>(
    pickupLocationId ? "PICKUP" : "DELIVERY",
  );
  const [paymentMethod, setPaymentMethod] = useState<CheckoutFormValues["paymentMethod"]>("PIX");
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingType: pickupLocationId ? "PICKUP" : "DELIVERY",
      paymentMethod: "PIX",
      shippingMethodId: shippingMethodId ?? undefined,
      pickupLocationId: pickupLocationId ?? pickupOptions[0]?.id,
    },
  });
  const shippingTypeRegister = form.register("shippingType", {
    onChange: (event) => setShippingType(event.target.value),
  });
  const paymentMethodRegister = form.register("paymentMethod", {
    onChange: (event) => setPaymentMethod(event.target.value),
  });

  return (
    <form action={submitCheckout} className="grid gap-5">
      <section className="surface grid gap-5 p-5 md:p-6">
        <StepTitle number="1" title="Dados do cliente" text="Informacoes para contato, nota e confirmacao do pedido." icon={UserRound} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-black">Nome<input className="field mt-2" {...form.register("customerName")} name="customerName" /></label>
          <label className="text-sm font-black">E-mail<input className="field mt-2" type="email" {...form.register("customerEmail")} name="customerEmail" /></label>
          <label className="text-sm font-black">WhatsApp<input className="field mt-2" {...form.register("customerPhone")} name="customerPhone" /></label>
          <label className="text-sm font-black">CPF/CNPJ<input className="field mt-2" {...form.register("document")} name="document" /></label>
        </div>
      </section>

      <section className="surface grid gap-5 p-5 md:p-6">
        <StepTitle number="2" title="Entrega ou retirada" text="Retire na loja sem frete ou receba no endereco informado." icon={Truck} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-[var(--brand)] ${shippingType === "DELIVERY" ? "border-[var(--brand)] bg-[#fff1ef] shadow-[0_12px_28px_rgb(242_56_47_/_10%)]" : "border-[var(--line)] bg-white"}`}>
            <input className="accent-[var(--brand)]" type="radio" value="DELIVERY" {...shippingTypeRegister} name="shippingType" />
            <MapPin size={21} className="text-[var(--brand)]" />
            <span>
              <span className="block font-black">Receber no endereco</span>
              <span className="text-xs font-semibold text-[var(--muted)]">Calculo por CEP e metodo escolhido</span>
            </span>
          </label>
          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-[var(--brand)] ${shippingType === "PICKUP" ? "border-[var(--brand)] bg-[#fff1ef] shadow-[0_12px_28px_rgb(242_56_47_/_10%)]" : "border-[var(--line)] bg-white"}`}>
            <input className="accent-[var(--brand)]" type="radio" value="PICKUP" {...shippingTypeRegister} name="shippingType" />
            <Store size={21} className="text-[var(--brand)]" />
            <span>
              <span className="block font-black">Retirar na loja</span>
              <span className="text-xs font-semibold text-[var(--muted)]">Sem frete e com protocolo</span>
            </span>
          </label>
        </div>

        {shippingType === "DELIVERY" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="shippingMethodId" value={shippingMethodId ?? ""} />
            <label className="text-sm font-black">CEP<input className="field mt-2" {...form.register("zipCode")} name="zipCode" /></label>
            <label className="text-sm font-black">Rua<input className="field mt-2" {...form.register("street")} name="street" /></label>
            <label className="text-sm font-black">Numero<input className="field mt-2" {...form.register("number")} name="number" /></label>
            <label className="text-sm font-black">Complemento<input className="field mt-2" {...form.register("complement")} name="complement" /></label>
            <label className="text-sm font-black">Bairro<input className="field mt-2" {...form.register("district")} name="district" /></label>
            <label className="text-sm font-black">Cidade<input className="field mt-2" {...form.register("city")} name="city" /></label>
            <label className="text-sm font-black">UF<input className="field mt-2" maxLength={2} {...form.register("state")} name="state" /></label>
          </div>
        ) : (
          <div className="grid gap-3">
            {pickupOptions.map((pickup) => (
              <label key={pickup.id} className="rounded-lg border border-[var(--line)] bg-white p-4 transition hover:border-[var(--brand)]">
                <span className="flex items-center gap-3 font-black">
                  <input className="accent-[var(--brand)]" type="radio" value={pickup.id} {...form.register("pickupLocationId")} name="pickupLocationId" />
                  {pickup.name}
                </span>
                <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">{pickup.instructions}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="surface grid gap-5 p-5 md:p-6">
        <StepTitle number="3" title="Pagamento Mercado Pago" text="PIX ou cartao com retorno automatico de status." icon={ShieldCheck} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-[var(--brand)] ${paymentMethod === "PIX" ? "border-[var(--brand)] bg-[#fff1ef] shadow-[0_12px_28px_rgb(242_56_47_/_10%)]" : "border-[var(--line)] bg-white"}`}>
            <input className="accent-[var(--brand)]" type="radio" value="PIX" {...paymentMethodRegister} name="paymentMethod" />
            <QrCode size={21} className="text-[var(--brand)]" />
            <span>
              <span className="block font-black">PIX</span>
              <span className="text-xs font-semibold text-[var(--muted)]">Rapido para confirmar</span>
            </span>
          </label>
          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-[var(--brand)] ${paymentMethod === "CREDIT_CARD" ? "border-[var(--brand)] bg-[#fff1ef] shadow-[0_12px_28px_rgb(242_56_47_/_10%)]" : "border-[var(--line)] bg-white"}`}>
            <input className="accent-[var(--brand)]" type="radio" value="CREDIT_CARD" {...paymentMethodRegister} name="paymentMethod" />
            <CreditCard size={21} className="text-[var(--brand)]" />
            <span>
              <span className="block font-black">Cartao</span>
              <span className="text-xs font-semibold text-[var(--muted)]">Processado pelo Mercado Pago</span>
            </span>
          </label>
        </div>
      </section>

      {Object.values(form.formState.errors)[0]?.message && (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{Object.values(form.formState.errors)[0]?.message}</p>
      )}
      <div className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
          <ShieldCheck size={18} className="text-[var(--brand)]" />
          Pedido protegido e status atualizado automaticamente.
        </span>
        <button className="btn btn-primary min-h-12 px-6" type="submit">Finalizar pedido</button>
      </div>
    </form>
  );
}
