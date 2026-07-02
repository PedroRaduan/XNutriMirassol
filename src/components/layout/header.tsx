import Link from "next/link";
import { Menu, MessageCircle, Search, ShoppingCart, Store, UserRound } from "lucide-react";
import { XNutriLogo } from "@/components/layout/xnutri-logo";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getCartForDisplay } from "@/lib/ecommerce/cart";
import { getWhatsAppHref } from "@/lib/whatsapp";

const nav = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/catalogo?category=suplementos", label: "Suplementos" },
  { href: "/catalogo?category=roupas-fitness", label: "Moda fitness" },
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
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/95 shadow-[0_10px_30px_rgb(17_17_17_/_6%)] backdrop-blur-xl">
      <div className="container-x flex min-h-16 min-w-0 items-center gap-2 sm:min-h-20 sm:gap-3">
        <Link href="/" aria-label="XNutri home" className="site-header-logo-link shrink-0">
          <XNutriLogo className="site-header-logo" />
        </Link>

        <form action="/catalogo" className="ml-auto hidden min-w-0 max-w-xl flex-1 items-center gap-2 rounded-lg border border-[var(--line)] bg-[#f8f9fb] px-3 py-2.5 shadow-inner md:flex xl:ml-8">
          <Search size={18} className="text-[var(--muted)]" />
          <input name="q" placeholder="Buscar suplementos, roupas e acessórios..." className="min-w-0 w-full bg-transparent text-sm outline-none" />
        </form>

        <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn btn-secondary hidden shrink-0 px-3 xl:inline-flex" aria-label="Falar no WhatsApp">
          <MessageCircle size={18} />
          WhatsApp
        </a>

        <Link href={user ? "/cliente" : "/login"} className="btn btn-secondary hidden size-11 shrink-0 p-0 md:inline-flex" aria-label="Minha conta">
          <UserRound size={18} />
        </Link>

        <Link href="/carrinho" className="btn btn-primary relative ml-auto size-11 shrink-0 p-0 md:ml-0" aria-label="Carrinho">
          <ShoppingCart size={18} />
          {cart.count > 0 && (
            <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[var(--ink)] text-xs font-black text-white ring-2 ring-white">
              {cart.count}
            </span>
          )}
        </Link>

        <details className="mobile-menu relative shrink-0 xl:hidden">
          <summary className="btn btn-secondary size-11 cursor-pointer p-0" aria-label="Abrir menu de navegação">
            <Menu size={18} />
          </summary>
          <div className="mobile-menu-panel absolute right-0 top-full z-50 mt-3 max-h-[min(70vh,520px)] w-[min(90vw,360px)] overflow-y-auto rounded-lg border border-[var(--line)] bg-white p-3 shadow-2xl">
            <form action="/catalogo" className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[#f8f9fb] px-3 py-2.5">
              <Search size={17} className="text-[var(--muted)]" />
              <input name="q" placeholder="Buscar produtos" className="min-w-0 w-full bg-transparent text-sm outline-none" />
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
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="rounded-md px-3 py-2.5 text-sm font-black text-[var(--graphite)] hover:bg-[#fff0ee] hover:text-[var(--brand)]">
                Falar no WhatsApp
              </a>
            </nav>
          </div>
        </details>
      </div>

      <div className="hidden border-t border-[var(--line)] bg-white/90 xl:block">
        <div className="container-x flex min-h-11 items-center justify-between gap-6">
          <nav className="flex items-center gap-7 text-sm font-bold text-[var(--muted)]" aria-label="Navegação principal">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="group relative whitespace-nowrap py-3 transition-colors hover:text-[var(--brand)]">
                {item.label}
                <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-[var(--brand)] transition-transform duration-200 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
            <Store size={14} className="text-[var(--brand)]" />
            Compre online e retire em Mirassol
          </span>
        </div>
      </div>

      <form action="/catalogo" className="container-x flex pb-3 md:hidden">
        <div className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-[var(--line)] bg-[#f8f9fb] px-3 shadow-inner">
          <Search size={17} className="text-[var(--brand)]" />
          <input name="q" placeholder="Buscar na XNutri..." className="min-w-0 w-full bg-transparent text-[16px] outline-none" />
        </div>
      </form>
    </header>
  );
}
