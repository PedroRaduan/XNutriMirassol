import { Trash2 } from "lucide-react";
import { createAddress, deleteAddress } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseUnavailable } from "@/lib/db/errors";
import { fallbackAddresses } from "@/lib/fallback/customer";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await requireUser();
  let addresses;
  try {
    addresses = await prisma.address.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    addresses = fallbackAddresses;
  }

  return (
    <div>
      <h1 className="text-4xl font-black">Endereços</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="grid gap-4">
          {addresses.map((address) => (
            <article key={address.id} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong>{address.label}</strong>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {address.recipient}<br />
                    {address.street}, {address.number} {address.complement}<br />
                    {address.district}, {address.city}-{address.state}, {address.zipCode}
                  </p>
                </div>
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={address.id} />
                  <button className="btn btn-secondary px-3 text-red-700" aria-label="Excluir endereço"><Trash2 size={16} /></button>
                </form>
              </div>
            </article>
          ))}
          {addresses.length === 0 && <div className="surface p-6 text-[var(--muted)]">Nenhum endereço cadastrado.</div>}
        </section>

        <form action={createAddress} className="surface grid gap-3 self-start p-5">
          <h2 className="text-xl font-black">Novo endereço</h2>
          <input className="field" name="label" placeholder="Apelido" required />
          <input className="field" name="recipient" placeholder="Destinatário" required />
          <input className="field" name="zipCode" placeholder="CEP" required />
          <input className="field" name="street" placeholder="Rua" required />
          <input className="field" name="number" placeholder="Número" required />
          <input className="field" name="complement" placeholder="Complemento" />
          <input className="field" name="district" placeholder="Bairro" required />
          <input className="field" name="city" placeholder="Cidade" required />
          <input className="field" name="state" placeholder="UF" maxLength={2} required />
          <input className="field" name="reference" placeholder="Referência" />
          <button className="btn btn-primary">Adicionar endereço</button>
        </form>
      </div>
    </div>
  );
}
