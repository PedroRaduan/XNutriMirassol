import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { XNutriLogo } from "@/components/layout/xnutri-logo";
import { enterDemoAdmin } from "@/lib/actions/auth";
import { getCurrentAdmin } from "@/lib/auth/session";
import { isDemoModeAllowed } from "@/lib/db/errors";

export const metadata = {
  title: "Login Admin | XNutri",
  description: "Acesso ao painel administrativo da XNutri.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const admin = await getCurrentAdmin();

  // Keep an authenticated user on the access-denied screen instead of
  // bouncing between /admin and /admin/login forever (for example, CASHIER).
  if (admin && params.error !== "unauthorized") {
    redirect(params.callbackUrl?.startsWith("/admin") ? params.callbackUrl : "/admin");
  }

  return (
    <main className="admin-shell min-h-screen">
      <div className="container-x grid min-h-screen place-items-center py-10">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="Voltar para a loja" className="inline-flex">
            <XNutriLogo />
          </Link>

          <div className="surface mt-8 p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-lg bg-[#fff1ef] text-[var(--brand)]">
                <ShieldCheck size={22} />
              </span>
              <div>
                <h1 className="text-2xl font-black">Painel XNutri</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">Entre para cuidar da loja com segurança.</p>
              </div>
            </div>

            {params.error === "unauthorized" && (
              <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                Este usuário ainda não tem permissão administrativa ativa.
              </p>
            )}
            {params.error === "database" && (
              <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                <p>
                  Banco de dados offline. {isDemoModeAllowed()
                    ? "Você pode entrar em modo de treinamento para visualizar o painel sem gravar dados reais."
                    : "Reestabeleça a conexão com o PostgreSQL antes de acessar o painel."}
                </p>
                {isDemoModeAllowed() && (
                  <form action={enterDemoAdmin} className="mt-3">
                    <button className="btn btn-secondary w-full border-red-200 bg-white text-red-700 hover:bg-red-50">
                      Entrar no modo de treinamento
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="mt-6">
              <AdminLoginForm callbackUrl={params.callbackUrl} />
            </div>
          </div>

          <p className="mt-5 text-center text-xs font-semibold text-[var(--muted)]">
            Acesso reservado para a equipe autorizada da XNutri.
          </p>
        </div>
      </div>
    </main>
  );
}
