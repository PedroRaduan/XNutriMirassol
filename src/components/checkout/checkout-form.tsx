"use client";

import { useForm, useWatch } from "react-hook-form";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CheckCircle2, CreditCard, LoaderCircle, MapPin, QrCode, Save, ShieldCheck, Store, Truck, UserRound, type LucideIcon } from "lucide-react";
import { submitCheckout, type CheckoutActionState } from "@/lib/actions/checkout";
import { selectPickup, selectShipping } from "@/lib/actions/cart";
import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import { formatCurrency, onlyDigits } from "@/lib/utils";
import { checkoutSchema } from "@/lib/validations";

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

type CheckoutFormProps = {
  shippingMethodId?: string | null;
  shippingZipCode?: string | null;
  pickupLocationId?: string | null;
  pickupOptions: Array<{ id: string; name: string; instructions: string }>;
  subtotal: number;
  total: number;
  shippingMethodName?: string | null;
  shippingCost: number;
};

const initialCheckoutState: CheckoutActionState = { ok: false, message: "" };
const checkoutDraftKey = "xnutri:checkout-draft:v1";
const checkoutDraftMaxAge = 1000 * 60 * 60 * 24 * 30;

type CheckoutField = keyof CheckoutFormValues;

const checkoutFieldOrder: CheckoutField[] = [
  "customerName",
  "customerEmail",
  "customerPhone",
  "shippingType",
  "zipCode",
  "shippingMethodId",
  "street",
  "number",
  "district",
  "city",
  "state",
  "pickupLocationId",
  "paymentMethod",
];

const checkoutFieldLabels: Record<CheckoutField, string> = {
  customerName: "Nome",
  customerEmail: "E-mail",
  customerPhone: "WhatsApp",
  document: "CPF/CNPJ",
  shippingType: "Entrega ou retirada",
  paymentMethod: "Forma de pagamento",
  zipCode: "CEP",
  street: "Rua",
  number: "Número",
  complement: "Complemento",
  district: "Bairro",
  city: "Cidade",
  state: "UF",
  shippingMethodId: "Frete",
  pickupLocationId: "Ponto de retirada",
  notes: "Observações",
};

function friendlyFieldMessage(field: CheckoutField, message?: string) {
  if (field === "shippingMethodId") {
    return "Calcule e selecione uma opção de frete ou escolha retirada na loja.";
  }

  if (field === "pickupLocationId") {
    return "Escolha onde deseja retirar o pedido.";
  }

  if (field === "shippingType") {
    return "Escolha se deseja receber o pedido ou retirar na loja.";
  }

  if (field === "paymentMethod") {
    return "Escolha a forma de pagamento.";
  }

  if (!message || message === "Campo obrigatório") {
    return `Preencha o campo ${checkoutFieldLabels[field]}.`;
  }

  return message;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <span className="mt-1 block text-xs font-bold text-red-700">{message}</span>;
}

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

type ShippingQuote = {
  methodId: string;
  name: string;
  provider: "CORREIOS" | "MANUAL" | "PICKUP";
  price: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  description: string;
};

type ShippingQuoteState = {
  status: "idle" | "loading" | "ok" | "error";
  message: string;
  digits: string;
};

type ShippingSelectionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const persistedCheckoutFields: CheckoutField[] = [
  "customerName",
  "customerEmail",
  "customerPhone",
  "document",
  "shippingType",
  "paymentMethod",
  "zipCode",
  "street",
  "number",
  "complement",
  "district",
  "city",
  "state",
  "pickupLocationId",
  "notes",
];

function readCheckoutDraft() {
  try {
    const raw = window.localStorage.getItem(checkoutDraftKey);
    if (!raw) return null;

    const draft = JSON.parse(raw) as { savedAt?: unknown; values?: Record<string, unknown> };
    if (typeof draft.savedAt !== "number" || Date.now() - draft.savedAt > checkoutDraftMaxAge || !draft.values) {
      window.localStorage.removeItem(checkoutDraftKey);
      return null;
    }

    const values: Partial<CheckoutFormValues> = {};
    for (const field of persistedCheckoutFields) {
      const value = draft.values[field];
      if (typeof value === "string") {
        Object.assign(values, { [field]: value });
      }
    }

    if (values.shippingType !== "DELIVERY" && values.shippingType !== "PICKUP") {
      delete values.shippingType;
    }
    if (values.paymentMethod !== "PIX" && values.paymentMethod !== "CREDIT_CARD") {
      delete values.paymentMethod;
    }

    return values;
  } catch {
    return null;
  }
}

function writeCheckoutDraft(values: Partial<CheckoutFormValues>) {
  try {
    const persistedValues = Object.fromEntries(
      persistedCheckoutFields.map((field) => [field, typeof values[field] === "string" ? values[field] : ""]),
    );
    window.localStorage.setItem(checkoutDraftKey, JSON.stringify({ savedAt: Date.now(), values: persistedValues }));
    return true;
  } catch {
    return false;
  }
}

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

export function CheckoutForm({
  shippingMethodId,
  shippingZipCode,
  pickupLocationId,
  pickupOptions,
  subtotal,
  total,
  shippingMethodName,
  shippingCost,
}: CheckoutFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(submitCheckout, initialCheckoutState);
  const [transitionPending, startSubmitTransition] = useTransition();
  const [shippingPending, startShippingTransition] = useTransition();
  const [showStickySubmit, setShowStickySubmit] = useState(false);
  const [cepLookup, setCepLookup] = useState<CepLookupState>({ status: "idle", message: "", digits: "" });
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [shippingQuoteState, setShippingQuoteState] = useState<ShippingQuoteState>({ status: "idle", message: "", digits: "" });
  const [shippingQuoteAttempt, setShippingQuoteAttempt] = useState(0);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState(shippingMethodId ?? "");
  const [selectedShippingZipCode, setSelectedShippingZipCode] = useState(shippingZipCode ?? "");
  const [shippingSelection, setShippingSelection] = useState<ShippingSelectionState>({ status: "idle", message: "" });
  const submitAreaRef = useRef<HTMLDivElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const lastCepLookupRef = useRef("");
  const lastShippingQuoteRef = useRef("");
  const draftReadyRef = useRef(false);
  const initialShippingType: CheckoutFormValues["shippingType"] = pickupLocationId ? "PICKUP" : "DELIVERY";
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onBlur",
    defaultValues: {
      shippingType: pickupLocationId ? "PICKUP" : "DELIVERY",
      paymentMethod: "PIX",
      shippingMethodId: shippingMethodId ?? undefined,
      zipCode: shippingZipCode ?? undefined,
      pickupLocationId: pickupLocationId ?? pickupOptions[0]?.id,
    },
  });
  const shippingType = useWatch({ control: form.control, name: "shippingType" }) ?? initialShippingType;
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" }) ?? "PIX";
  const selectedPickupLocationId = useWatch({ control: form.control, name: "pickupLocationId" });
  const watchedZipCode = useWatch({ control: form.control, name: "zipCode" });
  const watchedCheckoutValues = useWatch({ control: form.control });
  const zipCodeRegister = form.register("zipCode");
  const currentCepDigits = onlyDigits(watchedZipCode ?? "");
  const shouldShowCepLookup = shippingType === "DELIVERY" && cepLookup.message && cepLookup.digits === currentCepDigits;
  const shouldShowShippingQuote = shippingType === "DELIVERY" && shippingQuoteState.message && shippingQuoteState.digits === currentCepDigits;
  const isSubmitting = pending || transitionPending || shippingPending;
  const fieldErrors = checkoutFieldOrder
    .map((field) => {
      const message = form.formState.errors[field]?.message;
      return message ? { field, message: friendlyFieldMessage(field, String(message)) } : null;
    })
    .filter(Boolean) as Array<{ field: CheckoutField; message: string }>;

  function scrollToCheckoutField(field?: CheckoutField) {
    const focusField = field === "shippingMethodId" ? "zipCode" : field;
    const element = focusField
      ? (document.querySelector(`[name="${focusField}"]`) as HTMLElement | null)
      : null;
    const target = element ?? errorSummaryRef.current;

    target?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (element && element.getAttribute("type") !== "hidden") {
      window.setTimeout(() => element.focus({ preventScroll: true }), 250);
    }
  }

  const clearSelectedShipping = useCallback((message = "") => {
    setSelectedShippingMethodId("");
    setSelectedShippingZipCode("");
    form.setValue("shippingMethodId", undefined, { shouldDirty: true, shouldValidate: false });
    if (message) setShippingSelection({ status: "error", message });
  }, [form]);

  function handleShippingTypeChange(next: CheckoutFormValues["shippingType"]) {
    form.setValue("shippingType", next, { shouldDirty: true, shouldValidate: true });
    form.clearErrors("shippingType");
    setShippingSelection({ status: "idle", message: "" });

    if (next !== "PICKUP") return;

    const nextPickupId = form.getValues("pickupLocationId") || pickupOptions[0]?.id;
    if (!nextPickupId) {
      form.setError("pickupLocationId", { type: "manual", message: "Escolha onde deseja retirar o pedido." });
      return;
    }

    form.setValue("pickupLocationId", nextPickupId, { shouldDirty: true, shouldValidate: true });
    const formData = new FormData();
    formData.set("pickupLocationId", nextPickupId);

    startShippingTransition(async () => {
      try {
        await selectPickup(formData);
        clearSelectedShipping();
        setShippingSelection({ status: "success", message: "Retirada na loja selecionada. O frete ficou grátis." });
        router.refresh();
      } catch (error) {
        setShippingSelection({ status: "error", message: error instanceof Error ? error.message : "Não foi possível selecionar a retirada agora." });
      }
    });
  }

  function handlePickupLocationChange(nextPickupId: string) {
    form.setValue("pickupLocationId", nextPickupId, { shouldDirty: true, shouldValidate: true });
    form.clearErrors("pickupLocationId");
    setShippingSelection({ status: "idle", message: "" });
    const formData = new FormData();
    formData.set("pickupLocationId", nextPickupId);

    startShippingTransition(async () => {
      try {
        await selectPickup(formData);
        clearSelectedShipping();
        setShippingSelection({ status: "success", message: "Ponto de retirada salvo no pedido." });
        router.refresh();
      } catch (error) {
        setShippingSelection({ status: "error", message: error instanceof Error ? error.message : "Não foi possível salvar o ponto de retirada." });
      }
    });
  }

  function handleSelectShipping(quote: ShippingQuote) {
    const digits = onlyDigits(form.getValues("zipCode") ?? "");
    if (digits.length !== 8) {
      form.setError("zipCode", { type: "manual", message: "Informe um CEP válido com 8 números." });
      scrollToCheckoutField("zipCode");
      return;
    }

    setShippingSelection({ status: "idle", message: "" });
    const formData = new FormData();
    formData.set("zipCode", digits);
    formData.set("methodId", quote.methodId);

    startShippingTransition(async () => {
      try {
        await selectShipping(formData);
        setSelectedShippingMethodId(quote.methodId);
        setSelectedShippingZipCode(digits);
        form.setValue("shippingMethodId", quote.methodId, { shouldDirty: true, shouldValidate: true });
        form.clearErrors(["zipCode", "shippingMethodId"]);
        setShippingSelection({ status: "success", message: `${quote.name} selecionado por ${quote.price === 0 ? "frete grátis" : formatCurrency(quote.price)}.` });
        router.refresh();
      } catch (error) {
        clearSelectedShipping();
        setShippingSelection({ status: "error", message: error instanceof Error ? error.message : "Não foi possível selecionar este frete." });
      }
    });
  }

  async function handleCheckoutSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const valid = await form.trigger(undefined, { shouldFocus: true });

    if (!valid) {
      const firstInvalidField = checkoutFieldOrder.find((field) => form.getFieldState(field).error);
      window.setTimeout(() => scrollToCheckoutField(firstInvalidField), 0);
      return;
    }

    const formData = new FormData(formElement);
    startSubmitTransition(() => {
      action(formData);
    });
  }

  function handleCheckoutKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter") return;

    const target = event.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    if (target instanceof HTMLButtonElement) return;

    event.preventDefault();
  }

  useEffect(() => {
    const draft = readCheckoutDraft();
    const currentValues = form.getValues();
    const restoredValues: CheckoutFormValues = {
      ...currentValues,
      ...draft,
      shippingType: draft?.shippingType ?? currentValues.shippingType ?? initialShippingType,
      paymentMethod: draft?.paymentMethod ?? currentValues.paymentMethod ?? "PIX",
      pickupLocationId:
        draft?.pickupLocationId && pickupOptions.some((pickup) => pickup.id === draft.pickupLocationId)
          ? draft.pickupLocationId
          : currentValues.pickupLocationId ?? pickupOptions[0]?.id,
      shippingMethodId: shippingMethodId ?? undefined,
    };

    form.reset(restoredValues);
    writeCheckoutDraft(restoredValues);
    draftReadyRef.current = true;
  }, [form, initialShippingType, pickupOptions, shippingMethodId]);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    writeCheckoutDraft(watchedCheckoutValues as Partial<CheckoutFormValues>);
  }, [watchedCheckoutValues]);

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
      setCepLookup({ status: "loading", message: "Buscando endereço pelo CEP...", digits });

      try {
        const response = await fetchWithTimeout(
          `/api/cep/${digits}`,
          { signal: controller.signal },
          { timeoutMessage: "A busca do CEP demorou mais que o esperado. Tente novamente." },
        );
        const payload = (await response.json()) as CepApiResponse | { error?: string };

        if (!response.ok || "error" in payload) {
          const errorPayload = payload as { error?: string };
          throw new Error(errorPayload.error ?? "CEP não encontrado.");
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
          message: address.street ? "Endereço preenchido pelo CEP. Confira o número antes de finalizar." : "CEP encontrado. Complete rua, bairro e número.",
          digits,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        lastCepLookupRef.current = "";
        setCepLookup({
          status: "error",
          message: error instanceof Error ? error.message : "Não foi possível buscar este CEP agora.",
          digits,
        });
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [form, shippingType, watchedZipCode]);

  useEffect(() => {
    if (shippingType !== "DELIVERY") return;

    const digits = onlyDigits(watchedZipCode ?? "");
    if (digits.length !== 8) {
      lastShippingQuoteRef.current = "";
      return;
    }

    const requestKey = `${digits}:${shippingQuoteAttempt}`;
    if (lastShippingQuoteRef.current === requestKey) return;

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      lastShippingQuoteRef.current = requestKey;
      setShippingQuoteState({ status: "loading", message: "Calculando as melhores opções de frete...", digits });

      try {
        const response = await fetchWithTimeout(
          "/api/shipping/quote",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ zipCode: digits, subtotal }),
            signal: controller.signal,
          },
          { timeoutMessage: "O cálculo do frete demorou mais que o esperado. Tente novamente." },
        );
        const payload = (await response.json().catch(() => null)) as { quotes?: ShippingQuote[]; error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Não foi possível calcular o frete para este CEP.");
        }

        const quotes = payload?.quotes ?? [];
        setShippingQuotes(quotes);

        if (quotes.length === 0) {
          clearSelectedShipping();
          setShippingQuoteState({
            status: "error",
            message: "Nenhuma opção de entrega está disponível para este CEP. Você ainda pode escolher retirada na loja.",
            digits,
          });
          return;
        }

        if (selectedShippingMethodId && !quotes.some((quote) => quote.methodId === selectedShippingMethodId)) {
          clearSelectedShipping("A opção de frete anterior não está mais disponível. Escolha uma nova opção.");
        }

        setShippingQuoteState({
          status: "ok",
          message: "Fretes calculados. Escolha uma opção para continuar.",
          digits,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setShippingQuotes([]);
        setShippingQuoteState({
          status: "error",
          message: error instanceof Error ? error.message : "Não foi possível calcular o frete agora.",
          digits,
        });
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [clearSelectedShipping, selectedShippingMethodId, shippingQuoteAttempt, shippingType, subtotal, watchedZipCode]);

  useEffect(() => {
    if (!state.message || state.ok) return;

    const lowerMessage = state.message.toLowerCase();

    if (lowerMessage.includes("cep") || lowerMessage.includes("frete") || lowerMessage.includes("endereço")) {
      scrollToCheckoutField("zipCode");
      return;
    }

    errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state.message, state.ok]);

  return (
    <form
      className="grid gap-5 pb-24 md:pb-0"
      noValidate
      onKeyDown={handleCheckoutKeyDown}
      onSubmit={handleCheckoutSubmit}
    >
      <section className="surface grid gap-5 p-5 md:p-6">
        <StepTitle number="1" title="Dados do cliente" text="Informações para contato, nota e confirmação do pedido." icon={UserRound} />
        <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-900" aria-live="polite">
          <Save size={16} className="mt-0.5 shrink-0" />
          <span>
            Salvamento automático ativo. Se você sair ou atualizar a página, seus dados continuarão neste dispositivo.
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-black">
            Nome
            <input className="field mt-2" autoComplete="name" {...form.register("customerName")} name="customerName" />
            <FieldError message={form.formState.errors.customerName?.message ? friendlyFieldMessage("customerName", String(form.formState.errors.customerName.message)) : undefined} />
          </label>
          <label className="text-sm font-black">
            E-mail
            <input className="field mt-2" type="email" inputMode="email" autoComplete="email" {...form.register("customerEmail")} name="customerEmail" />
            <FieldError message={form.formState.errors.customerEmail?.message ? friendlyFieldMessage("customerEmail", String(form.formState.errors.customerEmail.message)) : undefined} />
          </label>
          <label className="text-sm font-black">
            WhatsApp
            <input className="field mt-2" inputMode="tel" autoComplete="tel" {...form.register("customerPhone")} name="customerPhone" />
            <FieldError message={form.formState.errors.customerPhone?.message ? friendlyFieldMessage("customerPhone", String(form.formState.errors.customerPhone.message)) : undefined} />
          </label>
          <label className="text-sm font-black">CPF/CNPJ<input className="field mt-2" inputMode="numeric" autoComplete="off" {...form.register("document")} name="document" /></label>
        </div>
      </section>

      <section className="surface grid gap-5 p-5 md:p-6">
        <StepTitle number="2" title="Entrega ou retirada" text="Retire na loja sem frete ou receba no endereço informado." icon={Truck} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-[var(--brand)] ${shippingType === "DELIVERY" ? "border-[var(--brand)] bg-[#fff1ef] shadow-[0_12px_28px_rgb(242_56_47_/_10%)]" : "border-[var(--line)] bg-white"}`}>
            <input className="accent-[var(--brand)]" type="radio" value="DELIVERY" name="shippingType" checked={shippingType === "DELIVERY"} onChange={() => handleShippingTypeChange("DELIVERY")} disabled={shippingPending} />
            <MapPin size={21} className="text-[var(--brand)]" />
            <span>
              <span className="block font-black">Receber no endereço</span>
              <span className="text-xs font-semibold text-[var(--muted)]">Cálculo por CEP e método escolhido</span>
            </span>
          </label>
          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-[var(--brand)] ${shippingType === "PICKUP" ? "border-[var(--brand)] bg-[#fff1ef] shadow-[0_12px_28px_rgb(242_56_47_/_10%)]" : "border-[var(--line)] bg-white"}`}>
            <input className="accent-[var(--brand)]" type="radio" value="PICKUP" name="shippingType" checked={shippingType === "PICKUP"} onChange={() => handleShippingTypeChange("PICKUP")} disabled={shippingPending} />
            <Store size={21} className="text-[var(--brand)]" />
            <span>
              <span className="block font-black">Retirar na loja</span>
              <span className="text-xs font-semibold text-[var(--muted)]">Sem frete e com protocolo</span>
            </span>
          </label>
        </div>

        {shippingType === "DELIVERY" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="shippingMethodId" value={selectedShippingMethodId} />
            <label className="text-sm font-black">
              CEP
              <input
                className="field mt-2"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={9}
                {...zipCodeRegister}
                name="zipCode"
                onChange={(event) => {
                  zipCodeRegister.onChange(event);
                  const nextDigits = onlyDigits(event.target.value);
                  if (selectedShippingMethodId && nextDigits !== onlyDigits(selectedShippingZipCode)) {
                    clearSelectedShipping("O CEP foi alterado. Selecione novamente uma opção de frete para o novo endereço.");
                  }
                }}
              />
              <FieldError message={form.formState.errors.zipCode?.message ? friendlyFieldMessage("zipCode", String(form.formState.errors.zipCode.message)) : undefined} />
            </label>
            <div className="self-end text-xs font-semibold leading-5 text-[var(--muted)]">
              O endereço e as opções de frete são calculados automaticamente após os 8 números do CEP.
            </div>

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

            <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-[#fafafa] p-4 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-black">Opções de frete</h3>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Escolha uma opção antes de finalizar o pedido.</p>
                </div>
                {shippingQuoteState.status === "loading" && (
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-800">
                    <LoaderCircle size={15} className="animate-spin" /> Calculando
                  </span>
                )}
              </div>

              {selectedShippingMethodId && shippingMethodName && shippingQuotes.length === 0 && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                  <span className="inline-flex items-center gap-2 font-black"><CheckCircle2 size={17} /> {shippingMethodName}</span>
                  <strong>{shippingCost === 0 ? "Grátis" : formatCurrency(shippingCost)}</strong>
                </div>
              )}

              {shippingQuoteState.digits === currentCepDigits && shippingQuotes.map((quote) => {
                const selected = selectedShippingMethodId === quote.methodId;
                return (
                  <button
                    key={quote.methodId}
                    type="button"
                    className={`rounded-lg border p-4 text-left transition ${selected ? "border-[var(--brand)] bg-[#fff1ef] shadow-sm" : "border-[var(--line)] bg-white hover:border-[var(--brand)]"}`}
                    onClick={() => handleSelectShipping(quote)}
                    disabled={shippingPending}
                    aria-pressed={selected}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <strong className="flex items-center gap-2">
                          {selected && <CheckCircle2 size={17} className="shrink-0 text-[var(--brand)]" />}
                          {quote.name}
                        </strong>
                        <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--muted)]">
                          Prazo estimado: {quote.deliveryDaysMin} a {quote.deliveryDaysMax} dias úteis
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{quote.description}</span>
                      </span>
                      <strong className="shrink-0 text-[var(--brand-dark)]">{quote.price === 0 ? "Grátis" : formatCurrency(quote.price)}</strong>
                    </span>
                  </button>
                );
              })}

              {shouldShowShippingQuote && (
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-lg p-3 text-sm font-semibold ${
                    shippingQuoteState.status === "error"
                      ? "bg-red-50 text-red-800"
                      : shippingQuoteState.status === "loading"
                        ? "bg-blue-50 text-blue-800"
                        : "bg-green-50 text-green-800"
                  }`}
                  role={shippingQuoteState.status === "error" ? "alert" : undefined}
                  aria-live="polite"
                >
                  <span>{shippingQuoteState.message}</span>
                  {shippingQuoteState.status === "error" && currentCepDigits.length === 8 && (
                    <button className="font-black underline underline-offset-2" type="button" onClick={() => setShippingQuoteAttempt((attempt) => attempt + 1)}>
                      Tentar novamente
                    </button>
                  )}
                </div>
              )}

              <div className="md:col-span-2">
                <FieldError message={form.formState.errors.shippingMethodId?.message ? friendlyFieldMessage("shippingMethodId", String(form.formState.errors.shippingMethodId.message)) : undefined} />
              </div>
            </div>

            <label className="text-sm font-black">
              Rua
              <input className="field mt-2" autoComplete="address-line1" {...form.register("street")} name="street" />
              <FieldError message={form.formState.errors.street?.message ? friendlyFieldMessage("street", String(form.formState.errors.street.message)) : undefined} />
            </label>
            <label className="text-sm font-black">
              Número
              <input className="field mt-2" inputMode="numeric" autoComplete="address-line2" {...form.register("number")} name="number" />
              <FieldError message={form.formState.errors.number?.message ? friendlyFieldMessage("number", String(form.formState.errors.number.message)) : undefined} />
            </label>
            <label className="text-sm font-black">Complemento<input className="field mt-2" autoComplete="address-line3" {...form.register("complement")} name="complement" /></label>
            <label className="text-sm font-black">
              Bairro
              <input className="field mt-2" autoComplete="address-level3" {...form.register("district")} name="district" />
              <FieldError message={form.formState.errors.district?.message ? friendlyFieldMessage("district", String(form.formState.errors.district.message)) : undefined} />
            </label>
            <label className="text-sm font-black">
              Cidade
              <input className="field mt-2" autoComplete="address-level2" {...form.register("city")} name="city" />
              <FieldError message={form.formState.errors.city?.message ? friendlyFieldMessage("city", String(form.formState.errors.city.message)) : undefined} />
            </label>
            <label className="text-sm font-black">
              UF
              <input className="field mt-2 uppercase" autoComplete="address-level1" maxLength={2} {...form.register("state")} name="state" />
              <FieldError message={form.formState.errors.state?.message ? friendlyFieldMessage("state", String(form.formState.errors.state.message)) : undefined} />
            </label>
          </div>
        ) : (
          <div className="grid gap-3">
            {pickupOptions.map((pickup) => (
              <label key={pickup.id} className={`rounded-lg border p-4 transition hover:border-[var(--brand)] ${selectedPickupLocationId === pickup.id ? "border-[var(--brand)] bg-[#fff1ef]" : "border-[var(--line)] bg-white"}`}>
                <span className="flex items-center gap-3 font-black">
                  <input className="accent-[var(--brand)]" type="radio" value={pickup.id} name="pickupLocationId" checked={selectedPickupLocationId === pickup.id} onChange={() => handlePickupLocationChange(pickup.id)} disabled={shippingPending} />
                  {pickup.name}
                </span>
                <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">{pickup.instructions}</span>
              </label>
            ))}
            <FieldError message={form.formState.errors.pickupLocationId?.message ? friendlyFieldMessage("pickupLocationId", String(form.formState.errors.pickupLocationId.message)) : undefined} />
          </div>
        )}
        {shippingSelection.message && (
          <p className={`rounded-lg p-3 text-sm font-semibold ${shippingSelection.status === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`} role={shippingSelection.status === "error" ? "alert" : "status"} aria-live="polite">
            {shippingPending ? "Salvando sua escolha..." : shippingSelection.message}
          </p>
        )}
      </section>

      <section className="surface grid gap-5 p-5 md:p-6">
        <StepTitle number="3" title="Pagamento Mercado Pago" text="PIX ou cartão com retorno automático de status." icon={ShieldCheck} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-[var(--brand)] ${paymentMethod === "PIX" ? "border-[var(--brand)] bg-[#fff1ef] shadow-[0_12px_28px_rgb(242_56_47_/_10%)]" : "border-[var(--line)] bg-white"}`}>
            <input className="accent-[var(--brand)]" type="radio" value="PIX" name="paymentMethod" checked={paymentMethod === "PIX"} onChange={() => form.setValue("paymentMethod", "PIX", { shouldDirty: true, shouldValidate: true })} />
            <QrCode size={21} className="text-[var(--brand)]" />
            <span>
              <span className="block font-black">PIX</span>
              <span className="text-xs font-semibold text-[var(--muted)]">Rápido para confirmar</span>
            </span>
          </label>
          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-[var(--brand)] ${paymentMethod === "CREDIT_CARD" ? "border-[var(--brand)] bg-[#fff1ef] shadow-[0_12px_28px_rgb(242_56_47_/_10%)]" : "border-[var(--line)] bg-white"}`}>
            <input className="accent-[var(--brand)]" type="radio" value="CREDIT_CARD" name="paymentMethod" checked={paymentMethod === "CREDIT_CARD"} onChange={() => form.setValue("paymentMethod", "CREDIT_CARD", { shouldDirty: true, shouldValidate: true })} />
            <CreditCard size={21} className="text-[var(--brand)]" />
            <span>
              <span className="block font-black">Cartão</span>
              <span className="text-xs font-semibold text-[var(--muted)]">Processado pelo Mercado Pago</span>
            </span>
          </label>
        </div>
      </section>

      <section className="surface grid gap-4 p-5 md:p-6">
        <StepTitle number="4" title="Observações" text="Informe detalhes úteis para separação, entrega ou retirada do pedido." icon={Store} />
        <label className="text-sm font-black">
          Observações do pedido
          <textarea
            className="field mt-2 min-h-24"
            placeholder="Ex.: melhor horário para entrega, referência do endereço ou dúvida sobre retirada."
            {...form.register("notes")}
          />
        </label>
      </section>

      {fieldErrors.length > 0 && (
        <div ref={errorSummaryRef} className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" tabIndex={-1}>
          <strong className="block">Revise os dados para finalizar:</strong>
          <ul className="mt-2 grid gap-1">
            {fieldErrors.map((error) => (
              <li key={error.field}>
                <button className="text-left font-semibold underline-offset-2 hover:underline" type="button" onClick={() => scrollToCheckoutField(error.field)}>
                  {checkoutFieldLabels[error.field]}: {error.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {state.message && !state.ok && (
        <p ref={fieldErrors.length === 0 ? errorSummaryRef : undefined} className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert" tabIndex={-1}>{state.message}</p>
      )}
      <div ref={submitAreaRef} className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
          <ShieldCheck size={18} className="text-[var(--brand)]" />
          Pedido protegido e status atualizado automaticamente.
        </span>
        <button className="btn btn-primary min-h-12 px-6" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Finalizando..." : "Finalizar pedido"}
        </button>
      </div>

      {showStickySubmit && (
      <div className="mobile-sticky-action md:hidden">
        <div className="min-w-0">
          <span className="block text-xs font-black uppercase text-[var(--muted)]">Total do pedido</span>
          <strong className="block truncate text-lg">{formatCurrency(total)}</strong>
          <span className="mt-1 block text-[11px] font-bold text-[var(--muted)]">Mercado Pago seguro</span>
        </div>
        <button className="btn btn-primary min-w-[156px] px-4" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Finalizar"}
        </button>
      </div>
      )}
    </form>
  );
}
