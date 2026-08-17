"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StatePanel } from "@/components/ui/state-panel";

export default function ShopError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  return (
    <div className="container-x grid min-h-[58vh] place-items-center py-10 md:py-16">
      <StatePanel
        variant="error"
        title="Não foi possível carregar a loja"
        description="Seu carrinho e seus dados não foram apagados. Tente novamente ou volte ao catálogo para continuar comprando."
        action={
          <>
            <button className="btn btn-primary" type="button" onClick={() => unstable_retry()}>
              Tentar novamente
            </button>
            <Link className="btn btn-secondary" href="/catalogo">
              Ver catálogo
            </Link>
          </>
        }
      />
    </div>
  );
}
