"use client";

import { useForm, useWatch } from "react-hook-form";
import { useActionState, useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CreditCard, MapPin, QrCode, ShieldCheck, Store, Truck, UserRound, type LucideIcon } from "lucide-react";
import { submitCheckout, type CheckoutActionState } from "@/lib/actions/checkout";
import { formatCurrency, onlyDigits } from "@/lib/utils";
import { checkoutSchema } from "@/lib/validations";

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

type CheckoutFormProps = {
  shippingMethodId?: string | null;
  shippingZipCode?: string | null;
  pickupLocationId?: string | null;
  pickupOptions: Array<{ id: string; name: string; instructions: string }>;
  total: number;
};

const initialCheckoutState: CheckoutActionState = { ok: false, message: "" };

type CepLookupState = {
  status: "idle" | "loading" | "ok" | "error";
  message: string;
  digits: string;
};

type CepApiResponse = {
  zipCode: string;
  street: string;
  district: string;
  city: string;
  state: string;
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

export function CheckoutForm({ shippingMethodId, shippingZipCode, pickupLocationId, pickupOptions, total }: CheckoutFormProps) {
  const [state, action, pending] = useActionState(submitCheckout, initialCheckoutState);
  const [showStickySubmit, setShowStickySubmit] = useState(false);
  const [cepLookup, setCepLookup] = useState<CepLookupState>({ status: "idle", message: "", digits: "" });
  const submitAreaRef = useRef<HTMLDivElement>(null);
  const lastCepLookupRef = useRef("");
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
      zipCode: shippingZipCode ?? undefined,
      pickupLocationId: pickupLocationId ?? pickupOptions[0]?.id,
    },
  });
  const shippingTypeRegister = form.register("shippingType", {
    onChange: (event) => setShippingType(event.target.value),
  });
  const paymentMethodRegister = form.register("paymentMethod", {
    onChange: (event) => setPaymentMethod(event.target.value),
  });
  const watchedZipCode = useWatch({ control: form.control, name: "zipCode" });
  const currentCepDigits = onlyDigits(watchedZipCode ?? "");
  const shouldShowCepLookup = shippingType === "DELIVERY" && cepLookup.message && cepLookup.digits === currentCepDigits;

  useEffect(() => {
    function updateStickySubmit() {
      const node = submitAreaRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const visible = rect.bottom > 96 && rect.top < window.innerHeight - 96;
      setShowStickySubmit(window.scrollY > 280 && !visible);
    }

    updateStickySubmit();
    window.addEventListener("scroll", updateStickySubmit, { passive: true });
    window.addEventListener("resize", updateStickySubmit);
    return () => {
      window.removeEventListener("scroll", updateStickySubmit);
      window.removeEventListener("resize", updateStickySubmit);
    };
  }, []);

  useEffect(() => {
    if (shippingType !== "DELIVERY") {
      return;
    }

    const digits = onlyDigits(watchedZipCode ?? "");

    if (digits.length !== 8) {
      lastCepLookupRef.current = "";
      return;
    }

    if (lastCepLookupRef.current === digits) {
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      lastCepLookupRef.current = digits;
      setCepLookup({ status: "loading", message: "Buscando endereco pelo CEP...", digits });

      try {
        const response = await fetch(`/api/cep/${digits}`, { signal: controller.signal });
        const payload = (await response.json()) as CepApiResponse | { error?: string };

        if (!response.ok || "error" in payload) {
          const errorPayload = payload as { error?: string };
          throw new Error(errorPayload.error ?? "CEP nao encontrado.");
        }

        const address = payload as CepApiResponse;
        form.setValue("zipCode", address.zipCode, { shouldDirty: true, shouldValidate: true });
        if (address.street) form.setValue("street", address.street, { shouldDirty: true, shouldValidate: true });
        if (address.district) form.setValue("district", address.district, { shouldDirty: true, shouldValidate: true });
        form.setValue("city", address.city, { shouldDirty: true, shouldValidate: true });
        form.setValue("state", address.state, { shouldDirty: true, shouldValidate: true });
        form.clearErrors(["zipCode", "street", "district", "city", "state"]);

        setCepLookup({
          status: "ok",
          message: address.street ? "Endereco preenchido pelo CEP. Confira o numero antes de finalizar." : "CEP encontrado. Complete rua, bairro e numero.",
          digits,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        lastCepLookupRef.current = "";
        setCepLookup({
          status: "error",
          message: error instanceof Error ? error.message : "Nao foi possivel buscar este CEP agora.",
          digits,
        });
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [form, shippingType, watchedZipCode]);

  return (
    <form
      action={action}
      className="grid gap-5 pb-24 md:pb-0"
      onSubmit={() => {
        void form.trigger();
      }}
    >
      <section className="surface grid gap-5 p-5 md:p-6">
        <StepTitle number="1" title="Dados do cliente" text="Informacoes para contato, nota e confirmacao do pedido." icon={UserRound} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-black">Nome<input className="field mt-2" autoComplete="name" {...form.register("customerName")} name="customerName" /></label>
          <label className="text-sm font-black">E-mail<input className="field mt-2" type="email" inputMode="email" autoComplete="email" {...form.register("customerEmail")} name="customerEmail" /></label>
          <label className="text-sm font-black">WhatsApp<input className="field mt-2" inputMode="tel" autoComplete="tel" {...form.register("customerPhone")} name="customerPhone" /></label>
          <label className="text-sm font-black">CPF/CNPJ<input className="field mt-2" inputMode="numeric" autoComplete="off" {...form.register("document")} name="document" /></label>
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
            {!shippingMethodId && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 md:col-span-2">
                Para entrega, calcule e selecione um frete no carrinho antes de finalizar. Se preferir, escolha retirada na loja.
              </p>
            )}
            <label className="text-sm font-black">
              CEP
              <input className="field mt-2" inputMode="numeric" autoComplete="postal-code" maxLength={9} {...form.register("zipCode")} name="zipCode" />
              {form.formState.errors.zipCode?.message && <span className="mt-1 block text-xs font-bold text-red-700">{form.formState.errors.zipCode.message}</span>}
            </label>
            <label className="text-sm font-black">Rua<input className="field mt-2" autoComplete="address-line1" {...form.register("street")} name="street" /></label>
            <label className="text-sm font-black">Numero<input className="field mt-2" inputMode="numeric" autoComplete="address-line2" {...form.register("number")} name="number" /></label>
            <label className="text-sm font-black">Complemento<input className="field mt-2" autoComplete="address-line3" {...form.register("complement")} name="complement" /></label>
            <label className="text-sm font-black">Bairro<input className="field mt-2" autoComplete="address-level3" {...form.register("district")} name="district" /></label>
            <label className="text-sm font-black">Cidade<input className="field mt-2" autoComplete="address-level2" {...form.register("city")} name="city" /></label>
            <label className="text-sm font-black">UF<input className="field mt-2 uppercase" autoComplete="address-level1" maxLength={2} {...form.register("state")} name="state" /></label>
            {shouldShowCepLookup && (
              <p
                className={`rounded-lg p-3 text-sm font-semibold md:col-span-2 ${
                  cepLookup.status === "ok"
                    ? "bg-green-50 text-green-800"
                    : cepLookup.status === "loading"
                      ? "bg-blue-50 text-blue-800"
                      : "bg-red-50 text-red-800"
                }`}
                role={cepLookup.status === "error" ? "alert" : undefined}
                aria-live="polite"
              >
                {cepLookup.message}
              </p>
            )}
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
        <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{Object.values(form.formState.errors)[0]?.message}</p>
      )}
      {state.message && !state.ok && (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{state.message}</p>
      )}
      <div ref={submitAreaRef} className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
          <ShieldCheck size={18} className="text-[var(--brand)]" />
          Pedido protegido e status atualizado automaticamente.
        </span>
        <button className="btn btn-primary min-h-12 px-6" type="submit" disabled={pending}>
          {pending ? "Finalizando..." : "Finalizar pedido"}
        </button>
      </div>

      {showStickySubmit && (
      <div className="mobile-sticky-action md:hidden">
        <div className="min-w-0">
          <span className="block text-xs font-black uppercase text-[var(--muted)]">Total do pedido</span>
          <strong className="block truncate text-lg">{formatCurrency(total)}</strong>
          <span className="mt-1 block text-[11px] font-bold text-[var(--muted)]">Mercado Pago seguro</span>
        </div>
        <button className="btn btn-primary min-w-[156px] px-4" type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Finalizar"}
        </button>
      </div>
      )}
    </form>
  );
}
