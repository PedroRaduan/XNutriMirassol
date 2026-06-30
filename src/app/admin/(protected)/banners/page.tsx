import Image from "next/image";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-submit";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type HomeContent = {
  heroTitle?: string;
  heroSubtitle?: string;
  heroPrimaryLabel?: string;
  heroPrimaryHref?: string;
  heroSecondaryLabel?: string;
  heroSecondaryHref?: string;
  institutionalText?: string;
  footerText?: string;
};

function dateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16) : "";
}

function BannerForm({ banner }: { banner?: Awaited<ReturnType<typeof getBanners>>[number] }) {
  return (
    <AdminActionForm actionName="upsertBanner" className="grid gap-3">
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <input className="field" name="title" placeholder="Titulo" defaultValue={banner?.title} required />
      <input className="field" name="subtitle" placeholder="Subtitulo" defaultValue={banner?.subtitle ?? ""} />
      {banner ? (
        <input className="field" name="imageUrl" type="url" placeholder="URL da imagem" defaultValue={banner.imageUrl} required />
      ) : (
        <ImageUploadField name="imageUrl" placeholder="URL da imagem" required />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="field" name="ctaLabel" placeholder="Texto do botão" defaultValue={banner?.ctaLabel ?? ""} />
        <input className="field" name="ctaHref" placeholder="/catalogo" defaultValue={banner?.ctaHref ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select className="field" name="location" defaultValue={banner?.location ?? "HOME_HERO"}>
          <option value="HOME_HERO">Home hero</option>
          <option value="HOME_PROMO">Home promocional</option>
          <option value="CATALOG">Catálogo</option>
        </select>
        <input className="field" name="sortOrder" type="number" min={0} placeholder="Ordem" defaultValue={banner?.sortOrder ?? 0} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-black">Início<input className="field mt-2" name="startsAt" type="datetime-local" defaultValue={dateInput(banner?.startsAt)} /></label>
        <label className="text-sm font-black">Fim<input className="field mt-2" name="endsAt" type="datetime-local" defaultValue={dateInput(banner?.endsAt)} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold"><input className="accent-[var(--brand)]" name="active" type="checkbox" defaultChecked={banner?.active ?? true} /> Ativo</label>
      <AdminSubmitButton>{banner ? "Salvar banner" : "Criar banner"}</AdminSubmitButton>
    </AdminActionForm>
  );
}

async function getBanners() {
  return prisma.banner.findMany({ orderBy: [{ location: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }] });
}

export default async function AdminBannersPage() {
  await requireAdmin("content");
  const [banners, homeSetting] = await Promise.all([
    getBanners(),
    prisma.storeSetting.findUnique({ where: { key: "home" } }),
  ]);
  const home = (homeSetting?.value ?? {}) as HomeContent;

  return (
    <div>
      <div className="admin-page-heading mb-6">
        <span className="admin-eyebrow">Vitrine do site</span>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">Banners e home</h1>
        <p className="admin-page-copy mt-2 text-sm">Altere chamadas, botões e áreas promocionais que aparecem para os clientes.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
        <section className="grid gap-4">
          <AdminActionForm actionName="updateHomeContent" className="surface grid gap-3 p-5">
            <h2 className="text-xl font-black">Conteúdo da home</h2>
            <input className="field" name="heroTitle" placeholder="Título da hero" defaultValue={home.heroTitle ?? "Performance, saúde e estilo em um só lugar."} required />
            <textarea className="field min-h-24" name="heroSubtitle" placeholder="Subtítulo da hero" defaultValue={home.heroSubtitle ?? ""} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" name="heroPrimaryLabel" placeholder="Botão principal" defaultValue={home.heroPrimaryLabel ?? "Ver produtos"} required />
              <input className="field" name="heroPrimaryHref" placeholder="/catalogo" defaultValue={home.heroPrimaryHref ?? "/catalogo"} required />
              <input className="field" name="heroSecondaryLabel" placeholder="Botão secundário" defaultValue={home.heroSecondaryLabel ?? "Retirar na loja"} required />
              <input className="field" name="heroSecondaryHref" placeholder="/retirada-na-loja" defaultValue={home.heroSecondaryHref ?? "/retirada-na-loja"} required />
            </div>
            <textarea className="field min-h-24" name="institutionalText" placeholder="Texto institucional" defaultValue={home.institutionalText ?? ""} />
            <textarea className="field min-h-20" name="footerText" placeholder="Texto do rodapé/chamada" defaultValue={home.footerText ?? ""} />
            <AdminSubmitButton>Salvar conteúdo da home</AdminSubmitButton>
          </AdminActionForm>

          {banners.map((banner) => (
            <article key={banner.id} className="surface overflow-hidden">
              <div className="grid gap-4 p-5 md:grid-cols-[180px_1fr_auto]">
                <div className="relative aspect-video overflow-hidden rounded-md bg-[#f0efed]">
                  <Image src={banner.imageUrl} alt={banner.title} fill sizes="180px" className="object-cover" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{banner.title}</strong>
                    <span className="badge">{banner.location}</span>
                    <span className="badge">{banner.active ? "Ativo" : "Inativo"}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{banner.subtitle}</p>
                  <p className="mt-2 text-xs font-bold text-[var(--muted)]">
                    Ordem {banner.sortOrder} · {banner.startsAt ? formatDate(banner.startsAt) : "sem início"} até {banner.endsAt ? formatDate(banner.endsAt) : "sem fim"}
                  </p>
                </div>
                <AdminActionForm actionName="deactivateBanner">
                  <input type="hidden" name="id" value={banner.id} />
                  <ConfirmSubmitButton message="Desativar este banner?">Desativar</ConfirmSubmitButton>
                </AdminActionForm>
              </div>
              <details className="border-t border-[var(--line)]">
                <summary className="cursor-pointer p-4 font-black text-[var(--brand)]">Editar banner</summary>
                <div className="border-t border-[var(--line)] p-4">
                  <BannerForm banner={banner} />
                </div>
              </details>
            </article>
          ))}
          {banners.length === 0 && <div className="surface p-8 text-center text-[var(--muted)]">Nenhum banner cadastrado.</div>}
        </section>

        <aside className="surface self-start p-5 xl:sticky xl:top-8">
          <h2 className="text-xl font-black">Novo banner</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Use Cloudinary para subir a imagem ou cole uma URL externa.</p>
          <div className="mt-4">
            <BannerForm />
          </div>
        </aside>
      </div>
    </div>
  );
}
