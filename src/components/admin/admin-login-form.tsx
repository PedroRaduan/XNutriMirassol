"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { LockKeyhole } from "lucide-react";
import { loginAdminWithCredentials, type ActionState } from "@/lib/actions/auth";
import { loginSchema } from "@/lib/validations";

const initialState: ActionState = { ok: false, message: "" };

export function AdminLoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(loginAdminWithCredentials, initialState);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form action={action} className="grid gap-4" onSubmit={() => form.trigger()}>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/admin"} />
      <label className="text-sm font-black text-white">
        E-mail administrativo
        <input className="field mt-2" type="email" autoComplete="email" {...form.register("email")} name="email" />
        {form.formState.errors.email && <span className="mt-1 block text-xs text-red-200">{form.formState.errors.email.message}</span>}
      </label>
      <label className="text-sm font-black text-white">
        Senha
        <input className="field mt-2" type="password" autoComplete="current-password" {...form.register("password")} name="password" />
        {form.formState.errors.password && <span className="mt-1 block text-xs text-red-200">{form.formState.errors.password.message}</span>}
      </label>
      {state.message && (
        <p className="rounded-md border border-red-200/30 bg-red-500/15 p-3 text-sm font-semibold text-red-100">
          {state.message}
        </p>
      )}
      <button className="btn btn-primary min-h-12" disabled={pending} type="submit">
        <LockKeyhole size={18} />
        {pending ? "Validando..." : "Entrar no admin"}
      </button>
    </form>
  );
}
