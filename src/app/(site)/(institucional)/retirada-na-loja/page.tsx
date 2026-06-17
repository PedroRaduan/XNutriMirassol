import { MapPin, TicketCheck } from "lucide-react";
import { getPickupOptions } from "@/lib/shipping/quote";

export const dynamic = "force-dynamic";
export const metadata = { title: "Retirada na Loja" };

export default async function PickupPage() {
  const pickupOptions = await getPickupOptions();

  return (
    <div className="container-x py-12">
      <h1 className="text-4xl font-black">Retirada na Loja</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">Escolha retirada no checkout, não pague frete e apresente o protocolo gerado automaticamente.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="surface p-6">
          <TicketCheck className="text-[var(--brand)]" />
          <h2 className="mt-4 text-xl font-black">Como funciona</h2>
          <p className="mt-3 leading-7 text-[var(--muted)]">Após finalizar o pedido, o sistema gera um protocolo único. Quando o pagamento for confirmado, o pedido segue para preparação e pode ser retirado conforme orientação da loja.</p>
        </div>
        {pickupOptions.map((pickup) => (
          <div key={pickup.id} className="surface p-6">
            <MapPin className="text-[var(--brand)]" />
            <h2 className="mt-4 text-xl font-black">{pickup.name}</h2>
            <p className="mt-3 text-[var(--muted)]">{pickup.street}, {pickup.number} - {pickup.district}, {pickup.city}-{pickup.state}</p>
            <p className="mt-3 leading-7 text-[var(--muted)]">{pickup.instructions}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
