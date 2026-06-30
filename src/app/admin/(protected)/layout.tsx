import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/layout/admin-nav";
import { logout } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth/session";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const isDemo = "isDemo" in admin && admin.isDemo;

  return (
    <div className="admin-shell min-h-screen py-4 md:py-8">
      <div className="container-x grid gap-5 lg:grid-cols-[270px_1fr]">
        <AdminNav role={admin.adminRole} demo={isDemo} />
        <div className="min-w-0">
          <header className="admin-topbar mb-5 flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="admin-eyebrow">Painel da loja</span>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                Logado como <strong className="text-[var(--graphite)]">{admin.name ?? admin.email}</strong>
                <span className="mx-2 text-[var(--silver)]">/</span>
                perfil {admin.adminRole}{isDemo ? " treinamento" : ""}
              </p>
            </div>
            <form action={logout}>
              <button className="btn btn-secondary px-3">
                <LogOut size={17} />
                Sair
              </button>
            </form>
          </header>
          {isDemo && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800">
              Modo de treinamento ativo: o banco está offline. Você consegue visualizar o painel com dados simulados, mas cadastros, estoque, pedidos e relatórios reais ficam disponíveis quando o banco for iniciado e migrado.
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
