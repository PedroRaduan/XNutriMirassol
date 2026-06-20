"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { applyCoupon, clearCoupon, type CouponActionState } from "@/lib/actions/cart";

function CouponButton() {
  const { pending } = useFormStatus();

  return (
    <button className="btn btn-secondary shrink-0" disabled={pending}>
      {pending ? "Aplicando..." : "Aplicar"}
    </button>
  );
}

export function CouponForm({ coupon }: { coupon: { code: string } | null }) {
  const initialState: CouponActionState = { ok: false, message: "" };
  const [state, formAction] = useActionState(applyCoupon, initialState);

  if (coupon) {
    return (
      <div className="mt-4">
        <form action={clearCoupon} className="flex items-center justify-between rounded-md bg-[#fff1ef] p-3">
          <span className="font-black">{coupon.code}</span>
          <button className="text-sm font-black text-red-700">Remover</button>
        </form>
        <p className="mt-2 text-xs font-semibold text-emerald-700">Cupom aplicado ao resumo do pedido.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-4 grid gap-2">
      <div className="flex gap-2">
        <input className="field" name="code" placeholder="BEMVINDO10" />
        <CouponButton />
      </div>
      {state.message && (
        <p className={`text-xs font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
