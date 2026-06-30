"use client";

import { useActionState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import {
  runAdminAction,
  type AdminActionName,
  type AdminActionState,
} from "@/lib/actions/admin";

const initialState: AdminActionState = { ok: false, message: "" };

export function AdminActionForm({
  actionName,
  className,
  children,
}: {
  actionName: AdminActionName;
  className?: string;
  children: React.ReactNode;
}) {
  const actionWithName = runAdminAction.bind(null, actionName);
  const [state, action, pending] = useActionState(actionWithName, initialState);
  const Icon = state.ok ? CheckCircle2 : CircleAlert;

  return (
    <form action={action} className={className} aria-busy={pending}>
      {state.message && (
        <p
          className={`col-span-full mb-3 flex items-start gap-2 rounded-md border p-3 text-sm font-bold ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
          role={state.ok ? "status" : "alert"}
          aria-live="polite"
        >
          <Icon className="mt-0.5 shrink-0" size={17} />
          {state.message}
        </p>
      )}
      {children}
    </form>
  );
}
