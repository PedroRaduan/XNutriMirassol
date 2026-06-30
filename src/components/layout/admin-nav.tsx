import type { AdminRole } from "@prisma/client";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  ImageIcon,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  TicketPercent,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminModule } from "@/lib/auth/session";
import { canAccessAdminModule } from "@/lib/auth/session";
import { XNutriLogo } from "@/components/layout/xnutri-logo";

const items: Array<{ href: string; label: string; help: string; module: AdminModule; Icon: LucideIcon }> = [
  { href: "/admin", label: "Início", help: "Resumo da loja", module: "dashboard", Icon: LayoutDashboard },
  { href: "/admin/produtos", label: "Produtos", help: "Cadastro e edição", module: "products", Icon: Package },
  { href: "/admin/categorias", label: "Categorias", help: "Suplementos e roupas", module: "categories", Icon: Tags },
  { href: "/admin/estoque", label: "Estoque", help: "Saldos e alertas", module: "inventory", Icon: Boxes },
  { href: "/admin/cupons", label: "Cupons", help: "Descontos", module: "coupons", Icon: TicketPercent },
  { href: "/admin/pedidos", label: "Pedidos", help: "Vendas e status", module: "orders", Icon: ShoppingBag },
  { href: "/admin/clientes", label: "Clientes", help: "Cadastro e histórico", module: "customers", Icon: Users },
  { href: "/admin/relatorios", label: "Relatórios", help: "Números da loja", module: "reports", Icon: BarChart3 },
  { href: "/admin/financeiro", label: "Financeiro", help: "Lucro e margem", module: "finance", Icon: CircleDollarSign },
  { href: "/pdv", label: "PDV", help: "Caixa da loja física", module: "pos", Icon: Store },
  { href: "/admin/banners", label: "Banners", help: "Home e chamadas", module: "content", Icon: ImageIcon },
  { href: "/admin/entregas", label: "Frete e retirada", help: "Prazos e loja física", module: "shipping", Icon: Truck },
  { href: "/admin/configuracoes", label: "Configurações", help: "Dados gerais", module: "settings", Icon: Settings },
  { href: "/admin/auditoria", label: "Auditoria", help: "Histórico interno", module: "audit", Icon: ClipboardList },
];

export function AdminNav({ role, demo = false }: { role: AdminRole; demo?: boolean }) {
  const visibleItems = items.filter((item) => canAccessAdminModule(role, item.module) && (!demo || item.module === "dashboard"));

  return (
    <aside className="surface self-start overflow-hidden bg-white lg:sticky lg:top-8">
      <div className="border-b border-[var(--line)] bg-[#fff8f7] p-4">
        <XNutriLogo />
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#ffd2ca] bg-white px-3 py-2 text-xs font-black uppercase text-[var(--brand-dark)]">
          <ShieldCheck size={14} className="text-[var(--brand)]" />
          {role}
        </div>
        <p className="mt-3 text-xs font-semibold leading-5 text-[var(--muted)]">
          {demo
            ? "Modo de treinamento ativo: o banco está offline, então os cadastros reais ficam bloqueados."
            : "Use este menu para cuidar da loja: produtos, pedidos, estoque, descontos e conteúdo do site."}
        </p>
      </div>
      <nav className="grid gap-1 p-3">
        {visibleItems.map(({ href, label, help, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-12 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-black text-[var(--graphite)] transition hover:bg-[#fff1ef] hover:text-[var(--brand)]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#f3f4f6] text-[var(--muted)] transition group-hover:bg-white group-hover:text-[var(--brand)]">
              <Icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block">{label}</span>
              <span className="block truncate text-xs font-semibold text-[var(--muted)]">{help}</span>
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
