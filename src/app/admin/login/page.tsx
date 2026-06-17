import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { XNutriLogo } from "@/components/layout/xnutri-logo";
import { getCurrentAdmin } from "@/lib/auth/session";

export const metadata = {
  title: "Login Admin | XNutri",
  description: "Area privada de administracao da XNutri.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect(params.callbackUrl?.startsWith("/admin") ? params.callbackUrl : "/admin");
  }

  return (
    <main className="min-h-screen bg-[var(--ink)] text-white">
      <div className="container-x grid min-h-screen place-items-center py-10">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="Voltar para a loja" className="inline-flex">
            <XNutriLogo tone="light" />
          </Link>

          <div className="mt-8 rounded-lg border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-lg bg-white text-[var(--brand)]">
                <ShieldCheck size={22} />
              </span>
              <div>
                <h1 className="text-2xl font-black">Admin XNutri</h1>
                <p className="mt-1 text-sm text-white/60">Area privada para administradores autorizados.</p>
              </div>
            </div>

            {params.error === "unauthorized" && (
              <p className="mt-5 rounded-md border border-red-200/30 bg-red-500/15 p-3 text-sm font-semibold text-red-100">
                Voce nao tem permissao administrativa para acessar esta area.
              </p>
            )}

            <div className="mt-6">
              <AdminLoginForm callbackUrl={params.callbackUrl} />
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-white/45">
            Esta rota nao aparece na navegacao publica e exige permissao ativa no banco de dados.
          </p>
        </div>
      </div>
    </main>
  );
}
