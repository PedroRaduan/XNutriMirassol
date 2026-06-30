import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Store } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { XNutriLogo } from "@/components/layout/xnutri-logo";
import { enterDemoPOS } from "@/lib/actions/auth";
import { canAccessAdminModule, getCurrentAdmin } from "@/lib/auth/session";

export const metadata = {
  title: "Login PDV | XNutri",
  description: "Acesso ao sistema de caixa da XNutri.",
};

export default async function PDVLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const admin = await getCurrentAdmin();

  if (admin && canAccessAdminModule(admin.adminRole, "pos")) {
    redirect(params.callbackUrl?.startsWith("/pdv") ? params.callbackUrl : "/pdv");
  }

  return (
    <main className="min-h-screen bg-[#0f1013]">
      <div className="container-x grid min-h-screen place-items-center py-8">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="Voltar para a loja" className="inline-flex">
            <XNutriLogo tone="light" />
          </Link>

          <div className="surface mt-8 overflow-hidden">
            <div className="bg-gradient-to-br from-[#111216] via-[#351214] to-[#f2382f] p-6 text-white">
              <span className="grid size-12 place-items-center rounded-lg bg-white/12 text-white">
                <Store size={24} />
              </span>
              <h1 className="mt-4 text-2xl font-black">PDV XNutri</h1>
              <p className="mt-1 text-sm font-semibold text-white/78">Entre para vender no caixa da loja fisica.</p>
            </div>

            <div className="p-6">
              {params.error === "unauthorized" && (
                <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  Este usuario nao tem permissao para acessar o PDV.
                </p>
              )}
              {params.error === "database" && (
                <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  <p>
                    Banco de dados offline. {process.env.NODE_ENV === "production"
                      ? "Reestabeleça a conexão com o PostgreSQL antes de usar o caixa."
                      : "Você pode abrir o PDV em modo demo para visualizar a tela sem gravar vendas reais."}
                  </p>
                  {process.env.NODE_ENV !== "production" && (
                    <form action={enterDemoPOS} className="mt-3">
                      <button className="btn btn-secondary w-full border-red-200 bg-white text-red-700 hover:bg-red-50">
                        Entrar no PDV demo
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div className="mb-5 flex items-center gap-3 rounded-lg bg-[#f6f7f9] p-3 text-sm font-semibold text-[var(--muted)]">
                <ShieldCheck size={19} className="text-[var(--brand)]" />
                Acesso reservado para ADMIN, MANAGER e CASHIER.
              </div>

              <AdminLoginForm callbackUrl={params.callbackUrl?.startsWith("/pdv") ? params.callbackUrl : "/pdv"} submitLabel="Entrar no PDV" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
