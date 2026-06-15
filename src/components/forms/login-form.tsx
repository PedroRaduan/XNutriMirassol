"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { LogIn } from "lucide-react";
import { loginWithCredentials, type ActionState } from "@/lib/actions/auth";
import { loginSchema } from "@/lib/validations";

const initialState: ActionState = { ok: false, message: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginWithCredentials, initialState);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form action={action} className="surface grid gap-4 p-6" onSubmit={() => form.trigger()}>
      <label className="text-sm font-black">
        E-mail
        <input className="field mt-2" type="email" autoComplete="email" {...form.register("email")} name="email" />
        {form.formState.errors.email && <span className="mt-1 block text-xs text-red-700">{form.formState.errors.email.message}</span>}
      </label>
      <label className="text-sm font-black">
        Senha
        <input className="field mt-2" type="password" autoComplete="current-password" {...form.register("password")} name="password" />
        {form.formState.errors.password && <span className="mt-1 block text-xs text-red-700">{form.formState.errors.password.message}</span>}
      </label>
      {state.message && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p>}
      <button className="btn btn-primary" disabled={pending} type="submit">
        <LogIn size={18} />
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
