import Link from "next/link";
import { Menu, Search, ShoppingCart, UserRound } from "lucide-react";
import { XNutriLogo } from "@/components/layout/xnutri-logo";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getCartForDisplay } from "@/lib/ecommerce/cart";
import { getWhatsAppHref } from "@/lib/whatsapp";

const nav = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/catalogo?category=suplementos", label: "Suplementos" },
  { href: "/catalogo?category=roupas-fitness", label: "Moda fitness" },
  { href: "/catalogo?sort=discounts", label: "Ofertas" },
  { href: "/retirada-na-loja", label: "Retirada" },
  { href: "/contato", label: "Contato" },
];

type SettingValue = Record<string, string | number | boolean | null | undefined>;

function getText(value: unknown, key: string, fallback = "") {
  if (!value || typeof value !== "object") return fallback;
  const item = (value as SettingValue)[key];
  return item === undefined || item === null ? fallback : String(item);
}

export async function Header() {
  const [user, cart, storeSetting] = await Promise.all([
    getCurrentUser(),
    getCartForDisplay(),
    prisma.storeSetting.findUnique({ where: { key: "store" } }).catch(() => null),
  ]);
  const whatsappHref = getWhatsAppHref(getText(storeSetting?.value, "whatsapp", "5517997000000"));

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-white">
      <div className="container-x flex min-h-14 min-w-0 items-center gap-2 sm:gap-3 md:min-h-16">
        <Link href="/" aria-label="XNutri home" className="site-header-logo-link shrink-0">
          <XNutriLogo className="site-header-logo" subtitle />
        </Link>

        <form action="/catalogo" className="ml-auto hidden min-w-0 max-w-xl flex-1 items-center gap-2 rounded-md border border-[var(--line)] bg-[#faf9f7] px-3 py-2.5 md:flex lg:ml-8">
          <Search size={18} className="text-[var(--muted)]" />
          <input name="q" aria-label="Buscar produtos" placeholder="Buscar produtos..." className="min-w-0 w-full bg-transparent text-sm outline-none" />
        </form>

        <Link href={user ? "/cliente" : "/login"} className="btn btn-secondary hidden shrink-0 px-3 md:inline-flex" aria-label="Minha conta">
          <UserRound size={18} />
          <span>{user ? "Minha conta" : "Entrar"}</span>
        </Link>

        <Link href="/carrinho" className="btn btn-primary relative ml-auto h-10 min-h-10 w-10 shrink-0 px-0 sm:min-h-11 sm:w-auto sm:px-3 md:ml-0" aria-label="Carrinho">
          <ShoppingCart size={18} />
          <span className="hidden sm:inline">Carrinho</span>
          {cart.count > 0 && (
            <span data-testid="cart-count" className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[var(--ink)] text-xs font-bold text-white ring-2 ring-white">
              {cart.count}
            </span>
          )}
        </Link>

        <details className="mobile-menu relative shrink-0 lg:hidden">
          <summary className="btn btn-secondary size-10 min-h-10 cursor-pointer p-0 sm:size-11" aria-label="Abrir menu de navegação">
            <Menu size={18} />
          </summary>
          <div className="mobile-menu-panel absolute right-0 top-full z-50 mt-2 max-h-[min(70vh,520px)] w-[min(90vw,340px)] overflow-y-auto rounded-md border border-[var(--line)] bg-white p-3 shadow-sm">
            <nav className="grid gap-1">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-semibold text-[var(--graphite)] hover:bg-[#f7f6f4] hover:text-[var(--brand)]">
                  {item.label}
                </Link>
              ))}
              <Link href={user ? "/cliente" : "/login"} className="rounded-md px-3 py-2.5 text-sm font-semibold text-[var(--graphite)] hover:bg-[#f7f6f4] hover:text-[var(--brand)]">
                Minha conta
              </Link>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="rounded-md px-3 py-2.5 text-sm font-semibold text-[var(--graphite)] hover:bg-[#f7f6f4] hover:text-[var(--brand)]">
                Falar no WhatsApp
              </a>
            </nav>
          </div>
        </details>
      </div>

      <div className="hidden border-t border-[var(--line)] bg-white lg:block">
        <div className="container-x flex min-h-11 items-center justify-between gap-6">
          <nav className="flex items-center gap-7 text-sm font-semibold text-[var(--muted)]" aria-label="Navegação principal">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap py-3 transition-colors hover:text-[var(--brand)]">
                {item.label}
              </Link>
            ))}
          </nav>
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)]">Atendimento pelo WhatsApp</a>
        </div>
      </div>

      <form action="/catalogo" className="container-x flex pb-2 md:hidden">
        <div className="flex min-h-10 w-full items-center gap-2 rounded-md border border-[var(--line)] bg-[#faf9f7] px-3">
          <Search size={17} className="text-[var(--muted)]" />
          <input name="q" aria-label="Buscar produtos" placeholder="Buscar produtos..." className="min-w-0 w-full bg-transparent text-[16px] outline-none" />
        </div>
      </form>
    </header>
  );
}
