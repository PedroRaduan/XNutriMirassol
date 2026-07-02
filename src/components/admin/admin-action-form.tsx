"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  closeDetailsOnSuccess = false,
  resetOnSuccess = false,
}: {
  actionName: AdminActionName;
  className?: string;
  children: React.ReactNode;
  closeDetailsOnSuccess?: boolean;
  resetOnSuccess?: boolean;
}) {
  const actionWithName = runAdminAction.bind(null, actionName);
  const [state, action, pending] = useActionState(actionWithName, initialState);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const Icon = state.ok ? CheckCircle2 : CircleAlert;

  useEffect(() => {
    if (!state.ok || !state.message) return;

    if (resetOnSuccess) formRef.current?.reset();
    if (!closeDetailsOnSuccess) return;

    const details = formRef.current?.closest("details");
    if (!details) return;

    setShowSuccessToast(true);
    details.open = false;
    details.querySelector<HTMLElement>("summary")?.focus();

    const timeout = window.setTimeout(() => setShowSuccessToast(false), 3500);
    return () => window.clearTimeout(timeout);
  }, [closeDetailsOnSuccess, resetOnSuccess, state]);

  return (
    <>
      <form ref={formRef} action={action} className={className} aria-busy={pending}>
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
      {showSuccessToast && state.message && typeof document !== "undefined"
        ? createPortal(
            <p className="fixed bottom-5 right-5 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800 shadow-2xl" role="status" aria-live="polite">
              <CheckCircle2 className="shrink-0" size={18} />
              {state.message}
            </p>,
            document.body,
          )
        : null}
    </>
  );
}
