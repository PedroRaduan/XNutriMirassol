import Image from "next/image";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { createBanner } from "@/lib/actions/admin";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const banners = await prisma.banner.findMany({ orderBy: [{ location: "asc" }, { sortOrder: "asc" }] });

  return (
    <div>
      <h1 className="text-4xl font-black">Banners</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="grid gap-4">
          {banners.map((banner) => (
            <article key={banner.id} className="surface grid gap-4 p-5 md:grid-cols-[140px_1fr]">
              <div className="relative aspect-video overflow-hidden rounded-md bg-[#f0efed]">
                <Image src={banner.imageUrl} alt={banner.title} fill sizes="140px" className="object-cover" />
              </div>
              <div>
                <strong>{banner.title}</strong>
                <p className="mt-1 text-sm text-[var(--muted)]">{banner.subtitle}</p>
                <span className="badge mt-3 inline-flex">{banner.location}</span>
              </div>
            </article>
          ))}
        </section>
        <form action={createBanner} className="surface grid gap-3 self-start p-5">
          <h2 className="text-xl font-black">Novo banner</h2>
          <input className="field" name="title" placeholder="Título" required />
          <input className="field" name="subtitle" placeholder="Subtítulo" />
          <ImageUploadField name="imageUrl" placeholder="URL da imagem" required />
          <input className="field" name="ctaLabel" placeholder="Texto do botão" />
          <input className="field" name="ctaHref" placeholder="/catalogo" />
          <select className="field" name="location" defaultValue="HOME_HERO">
            <option value="HOME_HERO">Home Hero</option>
            <option value="HOME_PROMO">Home Promo</option>
            <option value="CATALOG">Catálogo</option>
          </select>
          <label className="flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked /> Ativo</label>
          <button className="btn btn-primary">Criar banner</button>
        </form>
      </div>
    </div>
  );
}
