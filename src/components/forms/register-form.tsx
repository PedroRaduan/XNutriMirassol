"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { registerCustomer, type ActionState } from "@/lib/actions/auth";
import { registerSchema } from "@/lib/validations";

const initialState: ActionState = { ok: false, message: "" };

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerCustomer, initialState);
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-6" onSubmit={() => form.trigger()}>
      <label className="text-sm font-semibold">
        Nome completo
        <input className="field mt-2" autoComplete="name" {...form.register("name")} name="name" />
      </label>
      <label className="text-sm font-semibold">
        E-mail
        <input className="field mt-2" type="email" autoComplete="email" {...form.register("email")} name="email" />
      </label>
      <label className="text-sm font-semibold">
        WhatsApp
        <input className="field mt-2" autoComplete="tel" {...form.register("phone")} name="phone" />
      </label>
      <label className="text-sm font-semibold">
        Senha
        <input className="field mt-2" type="password" autoComplete="new-password" {...form.register("password")} name="password" />
      </label>
      {Object.values(form.formState.errors)[0]?.message && (
        <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{Object.values(form.formState.errors)[0]?.message}</p>
      )}
      {state.message && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p>}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Criando..." : "Criar conta"}
      </button>
    </form>
  );
}
