import Link from "next/link";
import { Menu, Search, ShoppingCart, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartForDisplay } from "@/lib/ecommerce/cart";

const nav = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/catalogo?category=whey", label: "Whey" },
  { href: "/catalogo?category=creatina", label: "Creatina" },
  { href: "/catalogo?category=roupas-fitness", label: "Roupas" },
  { href: "/retirada-na-loja", label: "Retirada" },
  { href: "/contato", label: "Contato" },
];

export async function Header() {
  const [user, cart] = await Promise.all([getCurrentUser(), getCartForDisplay()]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/95 backdrop-blur">
      <div className="bg-[var(--ink)] text-white">
        <div className="container-x flex items-center justify-between py-2 text-xs font-medium">
          <span>XNutri Mirassol-SP</span>
          <span>PIX, cartão, entrega regional e retirada na loja</span>
        </div>
      </div>
      <div className="container-x flex min-h-20 items-center gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="XNutri home">
          <span className="grid size-12 place-items-center rounded-full border-4 border-[var(--ink)] bg-white font-black italic text-[var(--brand)] shadow-sm">
            X
          </span>
          <span className="leading-tight">
            <span className="block text-2xl font-black italic tracking-wide text-[var(--ink)]">Xnutri</span>
            <span className="block text-xs font-black uppercase text-[var(--brand)]">suplementos nutricionais</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-5 text-sm font-semibold text-[var(--muted)] lg:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[var(--brand)]">
              {item.label}
            </Link>
          ))}
        </nav>

        <form action="/catalogo" className="ml-auto hidden w-full max-w-sm items-center gap-2 rounded-md border border-[var(--line)] bg-[#f9faf7] px-3 py-2 md:flex">
          <Search size={18} className="text-[var(--muted)]" />
          <input name="q" placeholder="Buscar whey, creatina, vitaminas..." className="w-full bg-transparent text-sm outline-none" />
        </form>

        <Link href={user ? "/cliente" : "/login"} className="btn btn-secondary hidden px-3 md:inline-flex" aria-label="Minha conta">
          <UserRound size={18} />
        </Link>
        <Link href="/carrinho" className="btn btn-primary relative px-3" aria-label="Carrinho">
          <ShoppingCart size={18} />
          {cart.count > 0 && (
            <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[var(--accent)] text-xs font-black text-[var(--ink)]">
              {cart.count}
            </span>
          )}
        </Link>
        <Link href="/catalogo" className="btn btn-secondary px-3 lg:hidden" aria-label="Menu">
          <Menu size={18} />
        </Link>
      </div>
    </header>
  );
}
