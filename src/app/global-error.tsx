"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="pt-BR">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif", background: "#f6f6f4" }}>
          <section style={{ width: "min(100%, 560px)", padding: 32, borderRadius: 18, background: "white", boxShadow: "0 20px 60px rgba(20, 20, 24, .12)", textAlign: "center" }}>
            <p style={{ color: "#e7312a", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", fontSize: 12 }}>XNUTRI</p>
            <h1 style={{ margin: "10px 0", fontSize: 32 }}>Não conseguimos abrir esta página</h1>
            <p style={{ color: "#65656d", lineHeight: 1.65 }}>Tente novamente. Se o problema continuar, fale com o atendimento e informe o código de suporte.</p>
            {error.digest && <p style={{ color: "#777", fontSize: 12 }}>Código de suporte: {error.digest}</p>}
            <button type="button" onClick={() => unstable_retry()} style={{ marginTop: 18, minHeight: 46, padding: "0 22px", border: 0, borderRadius: 10, background: "#e7312a", color: "white", fontWeight: 800, cursor: "pointer" }}>
              Tentar novamente
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
