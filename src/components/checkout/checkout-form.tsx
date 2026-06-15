"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CreditCard, MapPin, QrCode } from "lucide-react";
import { submitCheckout } from "@/lib/actions/checkout";
import { checkoutSchema } from "@/lib/validations";

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

type CheckoutFormProps = {
  shippingMethodId?: string | null;
  pickupLocationId?: string | null;
  pickupOptions: Array<{ id: string; name: string; instructions: string }>;
};

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
      <section className="surface grid gap-4 p-5">
        <h2 className="text-lg font-black">Dados do cliente</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-black">Nome<input className="field mt-2" {...form.register("customerName")} name="customerName" /></label>
          <label className="text-sm font-black">E-mail<input className="field mt-2" type="email" {...form.register("customerEmail")} name="customerEmail" /></label>
          <label className="text-sm font-black">WhatsApp<input className="field mt-2" {...form.register("customerPhone")} name="customerPhone" /></label>
          <label className="text-sm font-black">CPF/CNPJ<input className="field mt-2" {...form.register("document")} name="document" /></label>
        </div>
      </section>

      <section className="surface grid gap-4 p-5">
        <h2 className="text-lg font-black">Entrega</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 ${shippingType === "DELIVERY" ? "border-[var(--brand)] bg-[#fff1ef]" : "border-[var(--line)]"}`}>
            <input type="radio" value="DELIVERY" {...shippingTypeRegister} name="shippingType" />
            <MapPin size={20} />
            <span className="font-black">Receber no endereço</span>
          </label>
          <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 ${shippingType === "PICKUP" ? "border-[var(--brand)] bg-[#fff1ef]" : "border-[var(--line)]"}`}>
            <input type="radio" value="PICKUP" {...shippingTypeRegister} name="shippingType" />
            <MapPin size={20} />
            <span className="font-black">Retirar na loja</span>
          </label>
        </div>

        {shippingType === "DELIVERY" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="shippingMethodId" value={shippingMethodId ?? ""} />
            <label className="text-sm font-black">CEP<input className="field mt-2" {...form.register("zipCode")} name="zipCode" /></label>
            <label className="text-sm font-black">Rua<input className="field mt-2" {...form.register("street")} name="street" /></label>
            <label className="text-sm font-black">Número<input className="field mt-2" {...form.register("number")} name="number" /></label>
            <label className="text-sm font-black">Complemento<input className="field mt-2" {...form.register("complement")} name="complement" /></label>
            <label className="text-sm font-black">Bairro<input className="field mt-2" {...form.register("district")} name="district" /></label>
            <label className="text-sm font-black">Cidade<input className="field mt-2" {...form.register("city")} name="city" /></label>
            <label className="text-sm font-black">UF<input className="field mt-2" maxLength={2} {...form.register("state")} name="state" /></label>
          </div>
        ) : (
          <div className="grid gap-3">
            {pickupOptions.map((pickup) => (
              <label key={pickup.id} className="rounded-md border border-[var(--line)] bg-white p-4">
                <span className="flex items-center gap-3 font-black">
                  <input type="radio" value={pickup.id} {...form.register("pickupLocationId")} name="pickupLocationId" />
                  {pickup.name}
                </span>
                <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">{pickup.instructions}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="surface grid gap-4 p-5">
        <h2 className="text-lg font-black">Pagamento Mercado Pago</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 ${paymentMethod === "PIX" ? "border-[var(--brand)] bg-[#fff1ef]" : "border-[var(--line)]"}`}>
            <input type="radio" value="PIX" {...paymentMethodRegister} name="paymentMethod" />
            <QrCode size={20} />
            <span className="font-black">PIX</span>
          </label>
          <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 ${paymentMethod === "CREDIT_CARD" ? "border-[var(--brand)] bg-[#fff1ef]" : "border-[var(--line)]"}`}>
            <input type="radio" value="CREDIT_CARD" {...paymentMethodRegister} name="paymentMethod" />
            <CreditCard size={20} />
            <span className="font-black">Cartão</span>
          </label>
        </div>
      </section>

      {Object.values(form.formState.errors)[0]?.message && (
        <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{Object.values(form.formState.errors)[0]?.message}</p>
      )}
      <button className="btn btn-primary min-h-12" type="submit">Finalizar pedido</button>
    </form>
  );
}
