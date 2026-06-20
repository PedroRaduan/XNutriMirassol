import Link from "next/link";
import { Menu, Search, ShoppingCart, UserRound } from "lucide-react";
import { XNutriLogo } from "@/components/layout/xnutri-logo";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartForDisplay } from "@/lib/ecommerce/cart";

const nav = [
  { href: "/catalogo", label: "Catalogo" },
  { href: "/catalogo?category=suplementos", label: "Suplementos" },
  { href: "/catalogo?category=roupas-fitness", label: "Roupas Fitness" },
  { href: "/retirada-na-loja", label: "Retirada" },
  { href: "/contato", label: "Contato" },
];

export async function Header() {
  const [user, cart] = await Promise.all([getCurrentUser(), getCartForDisplay()]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/95 shadow-[0_10px_30px_rgb(17_17_17_/_6%)] backdrop-blur-xl">
      <div className="hidden bg-[var(--ink)] text-white sm:block">
        <div className="container-x flex items-center justify-between gap-4 py-2 text-xs font-medium">
          <span>XNutri Mirassol-SP</span>
          <span className="hidden text-white/75 sm:inline">Entrega regional e retirada na loja em Mirassol</span>
        </div>
      </div>

      <div className="container-x flex min-h-16 items-center gap-2 sm:min-h-20 sm:gap-4">
        <Link href="/" aria-label="XNutri home">
          <XNutriLogo />
        </Link>

        <nav className="ml-4 hidden items-center gap-4 text-sm font-semibold text-[var(--muted)] xl:gap-5 lg:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="group relative whitespace-nowrap py-2 transition-colors hover:text-[var(--brand)]">
              {item.label}
              <span className="absolute inset-x-0 -bottom-1 h-0.5 origin-left scale-x-0 bg-[var(--brand)] transition-transform duration-200 group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        <form action="/catalogo" className="ml-auto hidden w-full max-w-xs items-center gap-2 rounded-lg border border-[var(--line)] bg-[#f8f9fb] px-3 py-2.5 shadow-inner xl:max-w-sm md:flex">
          <Search size={18} className="text-[var(--muted)]" />
          <input name="q" placeholder="Buscar suplementos ou roupas..." className="w-full bg-transparent text-sm outline-none" />
        </form>

        <Link href={user ? "/cliente" : "/login"} className="btn btn-secondary hidden px-3 md:inline-flex" aria-label="Minha conta">
          <UserRound size={18} />
        </Link>

        <Link href="/carrinho" className="btn btn-primary relative px-3" aria-label="Carrinho">
          <ShoppingCart size={18} />
          {cart.count > 0 && (
            <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[var(--ink)] text-xs font-black text-white ring-2 ring-white">
              {cart.count}
            </span>
          )}
        </Link>

        <details className="mobile-menu relative lg:hidden">
          <summary className="btn btn-secondary cursor-pointer px-3" aria-label="Abrir menu">
            <Menu size={18} />
          </summary>
          <div className="mobile-menu-panel absolute right-0 top-full mt-3 w-[min(90vw,360px)] rounded-lg border border-[var(--line)] bg-white p-3 shadow-2xl">
            <form action="/catalogo" className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[#f8f9fb] px-3 py-2.5">
              <Search size={17} className="text-[var(--muted)]" />
              <input name="q" placeholder="Buscar produtos" className="w-full bg-transparent text-sm outline-none" />
            </form>
            <nav className="grid gap-1">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-black text-[var(--graphite)] hover:bg-[#fff0ee] hover:text-[var(--brand)]">
                  {item.label}
                </Link>
              ))}
              <Link href={user ? "/cliente" : "/login"} className="rounded-md px-3 py-2.5 text-sm font-black text-[var(--graphite)] hover:bg-[#fff0ee] hover:text-[var(--brand)]">
                Minha conta
              </Link>
            </nav>
          </div>
        </details>
      </div>

      <form action="/catalogo" className="container-x flex pb-3 md:hidden">
        <div className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-[var(--line)] bg-[#f8f9fb] px-3 shadow-inner">
          <Search size={17} className="text-[var(--brand)]" />
          <input name="q" placeholder="Buscar suplementos ou roupas..." className="w-full bg-transparent text-[16px] outline-none" />
        </div>
      </form>
    </header>
  );
}
