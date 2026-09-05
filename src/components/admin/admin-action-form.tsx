"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert } from "lucide-react";
import {
  runAdminAction,
  type AdminActionName,
  type AdminActionState,
} from "@/lib/actions/admin";

const initialState: AdminActionState = { ok: false, message: "" };

function AdminSuccessToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 3500);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible || typeof document === "undefined") return null;

  return createPortal(
    <p className="fixed bottom-5 right-5 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800 shadow-2xl" role="status" aria-live="polite">
      <CheckCircle2 className="shrink-0" size={18} />
      {message}
    </p>,
    document.body,
  );
}

export function AdminActionForm({
  actionName,
  className,
  children,
  closeDetailsOnSuccess = false,
  closeDialogOnSuccess = false,
  resetOnSuccess = false,
}: {
  actionName: AdminActionName;
  className?: string;
  children: React.ReactNode;
  closeDetailsOnSuccess?: boolean;
  closeDialogOnSuccess?: boolean;
  resetOnSuccess?: boolean;
}) {
  const actionWithName = runAdminAction.bind(null, actionName);
  const [state, action, pending] = useActionState(actionWithName, initialState);
  const [submissionVersion, setSubmissionVersion] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const Icon = state.ok ? CheckCircle2 : CircleAlert;

  useEffect(() => {
    if (!state.message) return;

    if (!state.ok) {
      feedbackRef.current?.focus();
      return;
    }

    if (resetOnSuccess) formRef.current?.reset();
    if (closeDetailsOnSuccess) {
      const details = formRef.current?.closest("details");
      if (details) {
        details.open = false;
        details.querySelector<HTMLElement>("summary")?.focus();
      }
    }

    if (closeDialogOnSuccess) {
      formRef.current?.closest("dialog")?.close();
    }

  }, [closeDetailsOnSuccess, closeDialogOnSuccess, resetOnSuccess, state]);

  return (
    <>
      <form
        ref={formRef}
        action={action}
        className={className}
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const data = new FormData(event.currentTarget);
          setSubmissionVersion((current) => current + 1);
          startTransition(() => action(data));
        }}
      >
        {state.message && !state.ok && (
          <p
            ref={feedbackRef}
            className={`col-span-full mb-3 flex items-start gap-2 rounded-md border p-3 text-sm font-bold ${
              state.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
            role={state.ok ? "status" : "alert"}
            aria-live="polite"
            tabIndex={-1}
          >
            <Icon className="mt-0.5 shrink-0" size={17} />
            {state.message}
          </p>
        )}
        {children}
      </form>
      {state.ok && state.message && !pending && typeof document !== "undefined"
        ? <AdminSuccessToast key={`${actionName}-${submissionVersion}`} message={state.message} />
        : null}
    </>
  );
}
