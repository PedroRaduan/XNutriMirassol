import { ClientNav } from "@/components/layout/client-nav";
import { requireUser } from "@/lib/auth/session";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="container-x grid gap-6 py-10 lg:grid-cols-[240px_1fr]">
      <ClientNav />
      <div>{children}</div>
    </div>
  );
}
