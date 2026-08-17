"use client";

import { useEffect } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Falha ao carregar módulo administrativo", error.digest ?? "sem-codigo");
  }, [error]);

  return (
    <div className="surface grid min-h-[420px] place-items-center p-6 text-center" role="alert">
      <div className="max-w-lg">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-[var(--brand)]">
          <CircleAlert size={23} />
        </span>
        <span className="admin-eyebrow mt-4">Não foi possível carregar</span>
        <h1 className="mt-3 text-2xl font-black text-[var(--ink)]">Esta área do painel encontrou um problema</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Seus dados continuam seguros. Tente carregar novamente; se o problema persistir, consulte os logs da aplicação.
        </p>
        <button className="btn btn-primary mt-5" type="button" onClick={() => unstable_retry()}>
          <RotateCcw size={17} />
          Tentar novamente
        </button>
        {error.digest ? <p className="mt-3 text-xs text-[var(--muted)]">Código de suporte: {error.digest}</p> : null}
      </div>
    </div>
  );
}
