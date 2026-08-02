"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";

type Props = {
  orderNumber: string;
  accessToken?: string;
  checkoutUrl?: string | null;
};

export function PagBankCheckoutButton({ orderNumber, accessToken, checkoutUrl }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function openCheckout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/payments/pagbank/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, accessToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.checkoutUrl !== "string") {
        throw new Error(data.error ?? "Não foi possível abrir o pagamento.");
      }
      window.location.assign(data.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o pagamento.");
      setPending(false);
    }
  }

  if (checkoutUrl) {
    return (
      <a href={checkoutUrl} className="btn btn-primary">
        <CreditCard size={18} />
        Pagar com PagBank
      </a>
    );
  }

  return (
    <div className="grid justify-items-end gap-2">
      <button type="button" className="btn btn-primary" disabled={pending} onClick={openCheckout}>
        <CreditCard size={18} />
        {pending ? "Abrindo pagamento..." : "Pagar com PagBank"}
      </button>
      {error && <span role="alert" className="max-w-xs text-right text-xs font-semibold text-red-700">{error}</span>}
    </div>
  );
}
