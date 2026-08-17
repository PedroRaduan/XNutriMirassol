"use client";

import { useEffect, useId, useRef } from "react";
import { Plus, X } from "lucide-react";

export function AdminDrawer({
  title,
  description,
  triggerLabel,
  children,
  defaultOpen = false,
  size = "default",
  triggerClassName = "btn btn-primary",
}: {
  title: string;
  description?: string;
  triggerLabel: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  size?: "default" | "wide";
  triggerClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (defaultOpen && dialog && !dialog.open) dialog.showModal();
  }, [defaultOpen]);

  function close() {
    dialogRef.current?.close();
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className={triggerClassName}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Plus size={17} />
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        className={`admin-drawer ${size === "wide" ? "admin-drawer-wide" : ""}`}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => triggerRef.current?.focus()}
      >
        <div className="admin-drawer-panel">
          <header className="admin-drawer-header">
            <div className="min-w-0">
              <h2 id={titleId} className="text-xl font-black text-[var(--ink)] sm:text-2xl">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  {description}
                </p>
              ) : null}
            </div>
            <button className="btn btn-secondary shrink-0 px-3" type="button" onClick={close} aria-label={`Fechar ${title}`}>
              <X size={18} />
              <span className="hidden sm:inline">Fechar</span>
            </button>
          </header>
          <div className="admin-drawer-content">{children}</div>
        </div>
      </dialog>
    </>
  );
}
