import Image from "next/image";
import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-submit";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { deactivateBanner, updateHomeContent, upsertBanner } from "@/lib/actions/admin";
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
    <form action={upsertBanner} className="grid gap-3">
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <input className="field" name="title" placeholder="Titulo" defaultValue={banner?.title} required />
      <input className="field" name="subtitle" placeholder="Subtitulo" defaultValue={banner?.subtitle ?? ""} />
      {banner ? (
        <input className="field" name="imageUrl" type="url" placeholder="URL da imagem" defaultValue={banner.imageUrl} required />
      ) : (
        <ImageUploadField name="imageUrl" placeholder="URL da imagem" required />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="field" name="ctaLabel" placeholder="Texto do botao" defaultValue={banner?.ctaLabel ?? ""} />
        <input className="field" name="ctaHref" placeholder="/catalogo" defaultValue={banner?.ctaHref ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select className="field" name="location" defaultValue={banner?.location ?? "HOME_HERO"}>
          <option value="HOME_HERO">Home hero</option>
          <option value="HOME_PROMO">Home promocional</option>
          <option value="CATALOG">Catalogo</option>
        </select>
        <input className="field" name="sortOrder" type="number" min={0} placeholder="Ordem" defaultValue={banner?.sortOrder ?? 0} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-black">Inicio<input className="field mt-2" name="startsAt" type="datetime-local" defaultValue={dateInput(banner?.startsAt)} /></label>
        <label className="text-sm font-black">Fim<input className="field mt-2" name="endsAt" type="datetime-local" defaultValue={dateInput(banner?.endsAt)} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold"><input className="accent-[var(--brand)]" name="active" type="checkbox" defaultChecked={banner?.active ?? true} /> Ativo</label>
      <AdminSubmitButton>{banner ? "Salvar banner" : "Criar banner"}</AdminSubmitButton>
    </form>
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
      <div className="mb-6 text-white">
        <span className="text-xs font-black uppercase text-white/50">Conteudo do site</span>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">Banners e home</h1>
        <p className="mt-2 text-sm text-white/60">Controle banner principal, chamadas, botoes e areas promocionais da loja publica.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
        <section className="grid gap-4">
          <form action={updateHomeContent} className="surface grid gap-3 p-5">
            <h2 className="text-xl font-black">Conteudo da home</h2>
            <input className="field" name="heroTitle" placeholder="Titulo da hero" defaultValue={home.heroTitle ?? "Performance, saude e estilo em um so lugar."} required />
            <textarea className="field min-h-24" name="heroSubtitle" placeholder="Subtitulo da hero" defaultValue={home.heroSubtitle ?? ""} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" name="heroPrimaryLabel" placeholder="Botao principal" defaultValue={home.heroPrimaryLabel ?? "Ver produtos"} required />
              <input className="field" name="heroPrimaryHref" placeholder="/catalogo" defaultValue={home.heroPrimaryHref ?? "/catalogo"} required />
              <input className="field" name="heroSecondaryLabel" placeholder="Botao secundario" defaultValue={home.heroSecondaryLabel ?? "Retirar na loja"} required />
              <input className="field" name="heroSecondaryHref" placeholder="/retirada-na-loja" defaultValue={home.heroSecondaryHref ?? "/retirada-na-loja"} required />
            </div>
            <textarea className="field min-h-24" name="institutionalText" placeholder="Texto institucional" defaultValue={home.institutionalText ?? ""} />
            <textarea className="field min-h-20" name="footerText" placeholder="Texto do rodape/chamada" defaultValue={home.footerText ?? ""} />
            <AdminSubmitButton>Salvar conteudo da home</AdminSubmitButton>
          </form>

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
                    Ordem {banner.sortOrder} · {banner.startsAt ? formatDate(banner.startsAt) : "sem inicio"} ate {banner.endsAt ? formatDate(banner.endsAt) : "sem fim"}
                  </p>
                </div>
                <form action={deactivateBanner}>
                  <input type="hidden" name="id" value={banner.id} />
                  <ConfirmSubmitButton message="Desativar este banner?">Desativar</ConfirmSubmitButton>
                </form>
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
