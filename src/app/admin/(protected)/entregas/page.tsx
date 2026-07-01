import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-submit";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function stringifySettings(value: unknown) {
  if (!value) return "";
  return JSON.stringify(value, null, 2);
}

function ShippingMethodForm({ method }: { method?: Awaited<ReturnType<typeof getShippingMethods>>[number] }) {
  return (
    <AdminActionForm actionName="upsertShippingMethod" closeDetailsOnSuccess={Boolean(method)} className="grid gap-3">
      {method && <input type="hidden" name="id" value={method.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="field" name="name" placeholder="Nome do frete" defaultValue={method?.name} required />
        <input className="field" name="code" placeholder="codigo-unico" defaultValue={method?.code} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <select className="field" name="provider" defaultValue={method?.provider ?? "MANUAL"}>
          <option value="MANUAL">Frete manual</option>
          <option value="CORREIOS">Correios</option>
          <option value="PICKUP">Retirada</option>
        </select>
        <input className="field" name="basePrice" type="number" min={0} step="0.01" placeholder="Valor" defaultValue={method ? Number(method.basePrice) : 0} />
        <input className="field" name="freeAbove" type="number" min={0} step="0.01" placeholder="Grátis acima de" defaultValue={method?.freeAbove ? Number(method.freeAbove) : ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="field" name="deliveryDaysMin" type="number" min={0} placeholder="Prazo mínimo" defaultValue={method?.deliveryDaysMin ?? 1} />
        <input className="field" name="deliveryDaysMax" type="number" min={0} placeholder="Prazo máximo" defaultValue={method?.deliveryDaysMax ?? 3} />
      </div>
      <textarea
        className="field min-h-28 font-mono text-sm"
        name="settings"
        placeholder={'{"cities":["Mirassol"],"serviceCode":"04510"}'}
        defaultValue={stringifySettings(method?.settings)}
      />
      <label className="flex items-center gap-2 text-sm font-bold">
        <input className="accent-[var(--brand)]" name="active" type="checkbox" defaultChecked={method?.active ?? true} />
        Ativo
      </label>
      <AdminSubmitButton>{method ? "Salvar frete" : "Criar frete"}</AdminSubmitButton>
    </AdminActionForm>
  );
}

function PickupForm({ pickup }: { pickup?: Awaited<ReturnType<typeof getPickupLocations>>[number] }) {
  return (
    <AdminActionForm actionName="upsertPickupLocation" closeDetailsOnSuccess={Boolean(pickup)} className="grid gap-3">
      {pickup && <input type="hidden" name="id" value={pickup.id} />}
      <input className="field" name="name" placeholder="Nome do ponto de retirada" defaultValue={pickup?.name ?? "XNutri Mirassol"} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="field" name="zipCode" placeholder="CEP" defaultValue={pickup?.zipCode} required />
        <input className="field" name="street" placeholder="Rua" defaultValue={pickup?.street} required />
        <input className="field" name="number" placeholder="Número" defaultValue={pickup?.number} required />
        <input className="field" name="complement" placeholder="Complemento" defaultValue={pickup?.complement ?? ""} />
        <input className="field" name="district" placeholder="Bairro" defaultValue={pickup?.district} required />
        <input className="field" name="city" placeholder="Cidade" defaultValue={pickup?.city ?? "Mirassol"} required />
        <input className="field" name="state" placeholder="UF" maxLength={2} defaultValue={pickup?.state ?? "SP"} required />
      </div>
      <textarea className="field min-h-28" name="instructions" placeholder="Instrucoes para retirada" defaultValue={pickup?.instructions ?? ""} required />
      <label className="flex items-center gap-2 text-sm font-bold">
        <input className="accent-[var(--brand)]" name="active" type="checkbox" defaultChecked={pickup?.active ?? true} />
        Retirada ativa
      </label>
      <AdminSubmitButton>{pickup ? "Salvar retirada" : "Criar ponto de retirada"}</AdminSubmitButton>
    </AdminActionForm>
  );
}

async function getShippingMethods() {
  return prisma.shippingMethod.findMany({ orderBy: [{ provider: "asc" }, { basePrice: "asc" }] });
}

async function getPickupLocations() {
  return prisma.pickupLocation.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export default async function AdminShippingPage() {
  await requireAdmin("shipping");
  const [methods, pickups] = await Promise.all([getShippingMethods(), getPickupLocations()]);

  return (
    <div>
      <div className="admin-page-heading mb-6">
        <span className="admin-eyebrow">Entrega e retirada</span>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">Frete e retirada</h1>
        <p className="admin-page-copy mt-2 text-sm">
          Configure retirada gratuita, frete manual regional e dados preparados para Correios.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
        <section className="grid gap-4">
          <div className="surface p-5">
            <h2 className="text-xl font-black">Metodos de frete</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">O checkout usa apenas metodos ativos. Retirada sempre deve ter custo R$ 0.</p>
          </div>

          {methods.map((method) => (
            <article key={method.id} className="surface overflow-hidden">
              <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{method.name}</strong>
                    <span className="badge">{method.provider}</span>
                    <span className="badge">{method.active ? "Ativo" : "Inativo"}</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Codigo {method.code} · {formatCurrency(method.basePrice)} · {method.deliveryDaysMin} a {method.deliveryDaysMax} dia(s)
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Frete gratis acima de {method.freeAbove ? formatCurrency(method.freeAbove) : "não configurado"}.
                  </p>
                </div>
                <AdminActionForm actionName="setShippingMethodActive">
                  <input type="hidden" name="id" value={method.id} />
                  <input type="hidden" name="active" value={String(!method.active)} />
                  <ConfirmSubmitButton
                    message={method.active ? "Desativar este método de frete?" : "Ativar este método de frete?"}
                    className={method.active ? undefined : "btn btn-primary px-3"}
                  >
                    {method.active ? "Desativar" : "Ativar"}
                  </ConfirmSubmitButton>
                </AdminActionForm>
              </div>
              <details className="border-t border-[var(--line)]">
                <summary className="cursor-pointer p-4 font-black text-[var(--brand)]">Editar frete</summary>
                <div className="border-t border-[var(--line)] p-4">
                  <ShippingMethodForm method={method} />
                </div>
              </details>
            </article>
          ))}

          <div className="surface p-5">
            <h2 className="text-xl font-black">Pontos de retirada</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Pedidos com retirada ficam sem frete e podem ir para Aguardando retirada após pagamento.</p>
          </div>

          {pickups.map((pickup) => (
            <article key={pickup.id} className="surface overflow-hidden">
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{pickup.name}</strong>
                  <span className="badge">{pickup.active ? "Ativa" : "Inativa"}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {pickup.street}, {pickup.number} · {pickup.district} · {pickup.city}/{pickup.state} · CEP {pickup.zipCode}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">{pickup.instructions}</p>
              </div>
              <details className="border-t border-[var(--line)]">
                <summary className="cursor-pointer p-4 font-black text-[var(--brand)]">Editar retirada</summary>
                <div className="border-t border-[var(--line)] p-4">
                  <PickupForm pickup={pickup} />
                </div>
              </details>
            </article>
          ))}
        </section>

        <aside className="grid gap-6 self-start xl:sticky xl:top-8">
          <div className="surface p-5">
            <h2 className="text-xl font-black">Novo frete</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Para Correios, guarde codigo de servico e credenciais nas variaveis de ambiente.</p>
            <div className="mt-4">
              <ShippingMethodForm />
            </div>
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Nova retirada</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Use quando houver mais de um ponto ou outro horario de retirada.</p>
            <div className="mt-4">
              <PickupForm />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
