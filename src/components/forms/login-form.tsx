"use client";

import { startTransition, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { loginWithCredentials, loginWithGoogle, type ActionState } from "@/lib/actions/auth";
import { loginSchema } from "@/lib/validations";

const initialState: ActionState = { ok: false, message: "" };

type LoginFormProps = {
  callbackUrl: string;
  googleEnabled: boolean;
  oauthError?: string;
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.64.39 3.19 1.04 4.55l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}

function GoogleLoginButton() {
  const { pending } = useFormStatus();

  return (
    <button className="btn btn-secondary w-full" type="submit" disabled={pending}>
      <GoogleMark />
      {pending ? "Abrindo Google..." : "Continuar com Google"}
    </button>
  );
}

export function LoginForm({ callbackUrl, googleEnabled, oauthError }: LoginFormProps) {
  const [state, action, pending] = useActionState(loginWithCredentials, initialState);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-5 sm:p-6">
      {oauthError && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
          {oauthError}
        </p>
      )}

      {googleEnabled && (
        <>
          <form action={loginWithGoogle}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <GoogleLoginButton />
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-[var(--muted)]" aria-hidden="true">
            <span className="h-px flex-1 bg-[var(--line)]" />
            ou entre com e-mail
            <span className="h-px flex-1 bg-[var(--line)]" />
          </div>
        </>
      )}

      <form action={action} className="grid gap-4" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void form.handleSubmit(() => startTransition(() => action(data)))(event);
      }}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label className="text-sm font-semibold">
          E-mail
          <input className="field mt-2" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} {...form.register("email")} name="email" />
          {form.formState.errors.email && <span className="mt-1 block text-xs text-red-700">{form.formState.errors.email.message}</span>}
        </label>
        <label className="text-sm font-semibold">
          Senha
          <input className="field mt-2" type="password" autoComplete="current-password" {...form.register("password")} name="password" />
          {form.formState.errors.password && <span className="mt-1 block text-xs text-red-700">{form.formState.errors.password.message}</span>}
        </label>
        {state.message && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p>}
        <button className="btn btn-primary" disabled={pending} type="submit">
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
