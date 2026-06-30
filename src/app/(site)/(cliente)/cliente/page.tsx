import Link from "next/link";
import { MapPin, PackageCheck, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseUnavailable, isDemoModeAllowed } from "@/lib/db/errors";
import { getDemoOrders } from "@/lib/ecommerce/demo-cart";
import { fallbackAddresses, fallbackProfile } from "@/lib/fallback/customer";
import { formatCurrency, formatDate, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerPage() {
  const user = await requireUser();
  let orders;
  let addresses;
  let profile;

  try {
    [orders, addresses, profile] = await Promise.all([
      prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.address.count({ where: { userId: user.id } }),
      prisma.user.findUnique({ where: { id: user.id } }),
    ]);
  } catch (error) {
    if (!isDatabaseUnavailable(error) || !isDemoModeAllowed()) throw error;
    orders = await getDemoOrders();
    addresses = fallbackAddresses.length;
    profile = fallbackProfile(user);
  }

  return (
    <div>
      <h1 className="text-4xl font-black">Minha conta</h1>
      <p className="mt-2 text-[var(--muted)]">Olá, {profile?.name ?? user.email}.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link href="/cliente/pedidos" className="surface p-5 hover:border-[var(--brand)]">
          <PackageCheck className="text-[var(--brand)]" />
          <strong className="mt-4 block text-2xl">{orders.length}</strong>
          <span className="text-sm text-[var(--muted)]">Pedidos recentes</span>
        </Link>
        <Link href="/cliente/enderecos" className="surface p-5 hover:border-[var(--brand)]">
          <MapPin className="text-[var(--brand)]" />
          <strong className="mt-4 block text-2xl">{addresses}</strong>
          <span className="text-sm text-[var(--muted)]">Endereços salvos</span>
        </Link>
        <Link href="/cliente/perfil" className="surface p-5 hover:border-[var(--brand)]">
          <UserRound className="text-[var(--brand)]" />
          <strong className="mt-4 block text-2xl">Perfil</strong>
          <span className="text-sm text-[var(--muted)]">Dados cadastrais</span>
        </Link>
      </div>

      <section className="surface mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Últimos pedidos</h2>
          <Link href="/cliente/pedidos" className="text-sm font-black text-[var(--brand)]">Ver todos</Link>
        </div>
        <div className="mt-4 grid gap-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/pedido/${order.orderNumber}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3">
              <span>
                <strong>{order.orderNumber}</strong>
                <span className="block text-sm text-[var(--muted)]">{formatDate(order.createdAt)}</span>
              </span>
              <span className="badge">{statusLabel(order.status)}</span>
              <strong>{formatCurrency(order.total)}</strong>
            </Link>
          ))}
          {orders.length === 0 && <p className="text-[var(--muted)]">Nenhum pedido encontrado.</p>}
        </div>
      </section>
    </div>
  );
}
