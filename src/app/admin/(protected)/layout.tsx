import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/layout/admin-nav";
import { logout } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth/session";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="admin-shell min-h-screen py-4 md:py-8">
      <div className="container-x grid gap-5 lg:grid-cols-[270px_1fr]">
        <AdminNav role={admin.adminRole} />
        <div className="min-w-0">
          <header className="mb-5 flex flex-col gap-3 rounded-lg border border-white/10 bg-[#15161a] p-4 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs font-black uppercase text-white/45">Area privada</span>
              <p className="mt-1 text-sm font-semibold text-white/75">
                {admin.name ?? admin.email} · {admin.adminRole}
              </p>
            </div>
            <form action={logout}>
              <button className="btn border border-white/10 bg-white/10 px-3 text-white hover:bg-white/15">
                <LogOut size={17} />
                Sair
              </button>
            </form>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
