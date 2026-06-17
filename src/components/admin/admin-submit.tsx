"use client";

import { useFormStatus } from "react-dom";

export function AdminSubmitButton({ children, pendingText = "Salvando..." }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="btn btn-primary" disabled={pending} type="submit">
      {pending ? pendingText : children}
    </button>
  );
}

export function ConfirmSubmitButton({
  children,
  message = "Tem certeza?",
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
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? "Processando..." : children}
    </button>
  );
}
