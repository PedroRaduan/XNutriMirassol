"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

export function AdminSubmitButton({ children, pendingText = "Salvando..." }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="btn btn-primary" disabled={pending} type="submit" aria-disabled={pending}>
      {pending ? <LoaderCircle className="motion-safe:animate-spin" size={17} aria-hidden="true" /> : null}
      {pending ? pendingText : children}
    </button>
  );
}

export function ConfirmSubmitButton({
  children,
  message = "Confirmar esta alteração?",
  className = "btn btn-secondary px-3 text-red-700",
}: {
  children: React.ReactNode;
  message?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      disabled={pending}
      aria-disabled={pending}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? <LoaderCircle className="motion-safe:animate-spin" size={17} aria-hidden="true" /> : null}
      {pending ? "Processando..." : children}
    </button>
  );
}
