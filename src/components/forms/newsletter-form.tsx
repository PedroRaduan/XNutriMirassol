"use client";

import { useActionState } from "react";
import {
  subscribeNewsletter,
  type NewsletterActionState,
} from "@/lib/actions/newsletter";

const initialState: NewsletterActionState = { ok: false, message: "" };

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, initialState);

  return (
    <form action={action} className="self-start rounded-lg border border-[var(--line)] bg-[#faf9f7] p-4 sm:p-5">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-dark)]">Ofertas por e-mail</span>
      <h2 className="mt-1.5 text-lg font-bold">Novidades da XNutri</h2>
      <p className="mt-1.5 text-sm leading-5 text-[var(--muted)]">Receba promoções e avisos de reposição de estoque.</p>
      <label className="sr-only" htmlFor="newsletter-email">Seu e-mail</label>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input id="newsletter-email" className="field" type="email" name="email" placeholder="seu@email.com" autoComplete="email" required />
        <button className="btn btn-secondary px-4" type="submit" disabled={pending}>
          {pending ? "Enviando..." : state.ok ? "Cadastrado" : "Quero receber"}
        </button>
      </div>
      {state.message && (
        <p className={`mt-3 rounded-md p-3 text-sm font-semibold ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} role={state.ok ? "status" : "alert"} aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
