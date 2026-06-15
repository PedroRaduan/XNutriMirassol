import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";

const items = [
  { href: "/cliente", label: "Visão geral" },
  { href: "/cliente/pedidos", label: "Pedidos" },
  { href: "/cliente/perfil", label: "Perfil" },
  { href: "/cliente/enderecos", label: "Endereços" },
];

export function ClientNav() {
  return (
    <aside className="surface self-start p-4">
      <nav className="grid gap-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-black text-[var(--muted)] hover:bg-[#fff1ef] hover:text-[var(--brand)]">
            {item.label}
          </Link>
        ))}
      </nav>
      <form action={logout} className="mt-3 border-t border-[var(--line)] pt-3">
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-black text-red-700 hover:bg-red-50">
          <LogOut size={16} />
          Sair
        </button>
      </form>
    </aside>
  );
}
