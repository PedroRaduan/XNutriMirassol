import Link from "next/link";
import { BarChart3, Boxes, ImageIcon, LayoutDashboard, Package, ShoppingBag, Tags, TicketPercent, Users } from "lucide-react";

const items = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/produtos", label: "Produtos", Icon: Package },
  { href: "/admin/categorias", label: "Categorias", Icon: Tags },
  { href: "/admin/estoque", label: "Estoque", Icon: Boxes },
  { href: "/admin/cupons", label: "Cupons", Icon: TicketPercent },
  { href: "/admin/pedidos", label: "Pedidos", Icon: ShoppingBag },
  { href: "/admin/clientes", label: "Clientes", Icon: Users },
  { href: "/admin/relatorios", label: "Relatórios", Icon: BarChart3 },
  { href: "/admin/banners", label: "Banners", Icon: ImageIcon },
];

export function AdminNav() {
  return (
    <aside className="surface self-start p-4">
      <div className="mb-3 px-3 text-xs font-black uppercase text-[var(--muted)]">Admin XNutri</div>
      <nav className="grid gap-1">
        {items.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-black text-[var(--muted)] hover:bg-[#fff1ef] hover:text-[var(--brand)]">
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
