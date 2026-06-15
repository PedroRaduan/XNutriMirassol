import { AdminNav } from "@/components/layout/admin-nav";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="container-x grid gap-6 py-10 lg:grid-cols-[240px_1fr]">
      <AdminNav />
      <div>{children}</div>
    </div>
  );
}
