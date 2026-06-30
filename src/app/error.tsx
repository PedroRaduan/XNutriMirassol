"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-16">
      <section className="surface w-full max-w-xl p-6 text-center sm:p-10" role="alert">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-[var(--brand)]">
          <AlertTriangle size={28} />
        </span>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[var(--brand)]">Algo saiu do ritmo</p>
        <h1 className="mt-2 text-3xl font-black">Não foi possível carregar esta parte</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-[var(--muted)]">
          Seus dados continuam seguros. Tente novamente e, se o problema persistir, confira a conexão com o banco e as integrações.
        </p>
        {error.digest && <p className="mt-3 text-xs font-semibold text-[var(--muted)]">Código de suporte: {error.digest}</p>}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="btn btn-primary" type="button" onClick={() => unstable_retry()}>
            <RotateCcw size={18} /> Tentar novamente
          </button>
          <Link className="btn btn-secondary" href="/">
            <Home size={18} /> Ir para a home
          </Link>
        </div>
      </section>
    </main>
  );
}
