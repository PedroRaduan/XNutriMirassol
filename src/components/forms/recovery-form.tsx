"use client";

import { useActionState } from "react";
import { requestPasswordRecovery, type ActionState } from "@/lib/actions/auth";

const initialState: ActionState = { ok: false, message: "" };

export function RecoveryForm() {
  const [state, action, pending] = useActionState(requestPasswordRecovery, initialState);

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-6">
      <label className="text-sm font-semibold">
        E-mail
        <input className="field mt-2" type="email" name="email" autoComplete="email" required />
      </label>
      {state.message && (
        <p className={`rounded-md p-3 text-sm font-semibold ${state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {state.message}
        </p>
      )}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Enviando..." : "Enviar recuperação"}
      </button>
    </form>
  );
}
