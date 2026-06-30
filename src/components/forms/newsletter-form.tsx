"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  subscribeNewsletter,
  type NewsletterActionState,
} from "@/lib/actions/newsletter";

const initialState: NewsletterActionState = { ok: false, message: "" };

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, initialState);

  return (
    <form action={action} className="surface self-start p-5">
      <div className="flex items-center gap-2 text-[var(--brand)]">
        <CheckCircle2 size={20} />
        <span className="text-xs font-black uppercase">Novidades e ofertas</span>
      </div>
      <h2 className="mt-3 text-2xl font-black">Newsletter</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Receba promoções, reposição de estoque e campanhas da XNutri.</p>
      <label className="sr-only" htmlFor="newsletter-email">Seu e-mail</label>
      <input id="newsletter-email" className="field mt-4" type="email" name="email" placeholder="seu@email.com" autoComplete="email" required />
      <button className="btn btn-primary mt-3 w-full" type="submit" disabled={pending}>
        {pending ? "Cadastrando..." : state.ok ? "Cadastrado" : "Cadastrar"}
      </button>
      {state.message && (
        <p className={`mt-3 rounded-md p-3 text-sm font-bold ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} role={state.ok ? "status" : "alert"} aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
