import type { AdminRole } from "@prisma/client";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  ImageIcon,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tags,
  TicketPercent,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminModule } from "@/lib/auth/session";
import { canAccessAdminModule } from "@/lib/auth/session";
import { XNutriLogo } from "@/components/layout/xnutri-logo";

const items: Array<{ href: string; label: string; module: AdminModule; Icon: LucideIcon }> = [
  { href: "/admin", label: "Dashboard", module: "dashboard", Icon: LayoutDashboard },
  { href: "/admin/produtos", label: "Produtos", module: "products", Icon: Package },
  { href: "/admin/categorias", label: "Categorias", module: "categories", Icon: Tags },
  { href: "/admin/estoque", label: "Estoque", module: "inventory", Icon: Boxes },
  { href: "/admin/cupons", label: "Cupons", module: "coupons", Icon: TicketPercent },
  { href: "/admin/pedidos", label: "Pedidos", module: "orders", Icon: ShoppingBag },
  { href: "/admin/clientes", label: "Clientes", module: "customers", Icon: Users },
  { href: "/admin/relatorios", label: "Relatorios", module: "reports", Icon: BarChart3 },
  { href: "/admin/banners", label: "Banners", module: "content", Icon: ImageIcon },
  { href: "/admin/entregas", label: "Frete e retirada", module: "shipping", Icon: Truck },
  { href: "/admin/configuracoes", label: "Configuracoes", module: "settings", Icon: Settings },
  { href: "/admin/auditoria", label: "Auditoria", module: "audit", Icon: ClipboardList },
];

export function AdminNav({ role }: { role: AdminRole }) {
  const visibleItems = items.filter((item) => canAccessAdminModule(role, item.module));

  return (
    <aside className="surface self-start overflow-hidden border-white/10 bg-white lg:sticky lg:top-8">
      <div className="bg-[var(--ink)] p-4 text-white">
        <XNutriLogo tone="light" />
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black uppercase text-white/75">
          <ShieldCheck size={14} className="text-[var(--brand)]" />
          {role}
        </div>
        <p className="mt-3 text-xs font-semibold leading-5 text-white/60">
          Painel operacional privado para catalogo, pedidos, estoque, campanhas e configuracoes.
        </p>
      </div>
      <nav className="grid gap-1 p-3">
        {visibleItems.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-black text-[var(--muted)] transition hover:bg-[#fff1ef] hover:text-[var(--brand)]"
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
