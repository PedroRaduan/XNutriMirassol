import { AdminSubmitButton } from "@/components/admin/admin-submit";
import { updateStoreSettings } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type SettingValue = Record<string, string | number | boolean | null | undefined>;

function getText(value: unknown, key: string, fallback = "") {
  if (!value || typeof value !== "object") return fallback;
  const item = (value as SettingValue)[key];
  return item === undefined || item === null ? fallback : String(item);
}

export default async function AdminSettingsPage() {
  await requireAdmin("settings");
  const settings = await prisma.storeSetting.findMany({
    where: { key: { in: ["store", "checkout", "delivery", "payments"] } },
  });

  const byKey = new Map(settings.map((setting) => [setting.key, setting.value]));
  const store = byKey.get("store");
  const checkout = byKey.get("checkout");
  const delivery = byKey.get("delivery");
  const payments = byKey.get("payments");

  return (
    <div>
      <div className="admin-page-heading mb-6">
        <span className="admin-eyebrow">Configurações</span>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">Configurações</h1>
        <p className="admin-page-copy mt-2 text-sm">
          Dados gerais da loja, atendimento, pagamento, entrega e mensagem padrao de retirada.
        </p>
      </div>

      <form action={updateStoreSettings} className="grid gap-6">
        <section className="surface p-5">
          <h2 className="text-xl font-black">Dados da loja</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-black">Nome da loja<input className="field mt-2" name="storeName" defaultValue={getText(store, "name", "XNutri")} required /></label>
            <label className="text-sm font-black">Razao social<input className="field mt-2" name="legalName" defaultValue={getText(store, "legalName")} /></label>
            <label className="text-sm font-black">Telefone<input className="field mt-2" name="phone" defaultValue={getText(store, "phone")} /></label>
            <label className="text-sm font-black">WhatsApp<input className="field mt-2" name="whatsapp" defaultValue={getText(store, "whatsapp")} /></label>
            <label className="text-sm font-black">E-mail<input className="field mt-2" name="email" type="email" defaultValue={getText(store, "email", "contato@xnutri.com.br")} required /></label>
            <label className="text-sm font-black">Instagram<input className="field mt-2" name="instagram" defaultValue={getText(store, "instagram")} /></label>
            <label className="text-sm font-black md:col-span-2">Endereco<input className="field mt-2" name="address" defaultValue={getText(store, "address")} /></label>
            <label className="text-sm font-black">Cidade<input className="field mt-2" name="city" defaultValue={getText(store, "city", "Mirassol")} required /></label>
            <label className="text-sm font-black">Estado<input className="field mt-2" name="state" maxLength={2} defaultValue={getText(store, "state", "SP")} required /></label>
            <label className="text-sm font-black md:col-span-2">Horario de funcionamento
              <textarea className="field mt-2 min-h-24" name="businessHours" defaultValue={getText(store, "businessHours")} />
            </label>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="surface p-5">
            <h2 className="text-xl font-black">Pagamento</h2>
            <textarea className="field mt-4 min-h-40" name="paymentInfo" defaultValue={getText(payments, "instructions", "Pagamentos processados pelo Mercado Pago.")} />
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Entrega</h2>
            <textarea className="field mt-4 min-h-40" name="deliveryInfo" defaultValue={getText(delivery, "deliveryInfo", getText(delivery, "estimatedDeliveryText"))} />
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Retirada</h2>
            <textarea className="field mt-4 min-h-40" name="pickupMessage" defaultValue={getText(checkout, "defaultPickupMessage")} />
          </div>
        </section>

        <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[var(--muted)]">
            Essas informações ficam no banco e podem ser exibidas pelo site público.
          </p>
          <AdminSubmitButton pendingText="Salvando configurações...">Salvar configurações</AdminSubmitButton>
        </div>
      </form>
    </div>
  );
}
