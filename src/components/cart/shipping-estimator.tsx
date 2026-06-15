"use client";

import { useState, useTransition } from "react";
import { Truck } from "lucide-react";
import { selectShipping } from "@/lib/actions/cart";
import { formatCurrency } from "@/lib/utils";

type Quote = {
  methodId: string;
  name: string;
  provider: string;
  price: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  description: string;
};

export function ShippingEstimator({ subtotal }: { subtotal: number }) {
  const [zipCode, setZipCode] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [message, setMessage] = useState("");
  const [loading, startLoading] = useTransition();
  const [selecting, startSelecting] = useTransition();

  function quote() {
    setMessage("");
    startLoading(async () => {
      const response = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zipCode, subtotal }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Não foi possível calcular o frete.");
        return;
      }

      setQuotes(data.quotes);
    });
  }

  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2">
        <Truck size={18} />
        <h2 className="font-black">Frete</h2>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="field"
          value={zipCode}
          onChange={(event) => setZipCode(event.target.value)}
          placeholder="Digite seu CEP"
          inputMode="numeric"
        />
        <button className="btn btn-secondary" type="button" onClick={quote} disabled={loading}>
          {loading ? "..." : "Calcular"}
        </button>
      </div>
      {message && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{message}</p>}
      <div className="mt-4 grid gap-3">
        {quotes.map((quoteItem) => (
          <button
            key={quoteItem.methodId}
            type="button"
            className="rounded-md border border-[var(--line)] bg-white p-4 text-left hover:border-[var(--brand)]"
            disabled={selecting}
            onClick={() => {
              const formData = new FormData();
              formData.set("zipCode", zipCode);
              formData.set("methodId", quoteItem.methodId);
              startSelecting(async () => {
                await selectShipping(formData);
              });
            }}
          >
            <span className="flex items-center justify-between gap-3">
              <strong>{quoteItem.name}</strong>
              <strong>{quoteItem.price === 0 ? "Grátis" : formatCurrency(quoteItem.price)}</strong>
            </span>
            <span className="mt-1 block text-sm text-[var(--muted)]">
              {quoteItem.deliveryDaysMin} a {quoteItem.deliveryDaysMax} dias úteis · {quoteItem.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
