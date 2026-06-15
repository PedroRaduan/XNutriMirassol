import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { prisma } from "@/lib/db/prisma";
import { subscribeNewsletter } from "@/lib/actions/newsletter";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [hero, promo, categories, featured, bestSellers, reviews] = await Promise.all([
    prisma.banner.findFirst({ where: { location: "HOME_HERO", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.banner.findFirst({ where: { location: "HOME_PROMO", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, take: 6 }),
    prisma.product.findMany({
      where: { status: "ACTIVE", featured: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { take: 1 }, inventory: true },
      take: 4,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", bestSeller: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: { take: 1 }, inventory: true },
      take: 4,
    }),
    prisma.review.findMany({
      where: { approved: true },
      include: { product: { select: { name: true } } },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <section className="relative min-h-[calc(100vh-136px)] overflow-hidden bg-[var(--ink)] text-white">
        {hero && <Image src={hero.imageUrl} alt={hero.title} fill priority sizes="100vw" className="object-cover opacity-55" />}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
        <div className="container-x relative flex min-h-[calc(100vh-136px)] items-center py-16">
          <div className="max-w-2xl">
            <span className="badge border-white/30 bg-white/10 text-white">Mirassol-SP · suplementos nutricionais</span>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] md:text-7xl">{hero?.title ?? "XNutri"}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/86">{hero?.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={hero?.ctaHref ?? "/catalogo"} className="btn bg-white text-[var(--ink)] hover:bg-[#ecf1e7]">
                {hero?.ctaLabel ?? "Comprar agora"} <ArrowRight size={18} />
              </Link>
              <Link href="/catalogo?category=roupas-fitness" className="btn border border-white/35 text-white hover:bg-white/10">
                Ver roupas fitness
              </Link>
              <Link href="/retirada-na-loja" className="btn border border-white/35 text-white hover:bg-white/10">
                Retirar na loja
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x -mt-8 relative z-10 grid gap-3 md:grid-cols-4">
        {[
          { Icon: Truck, title: "Entrega regional", text: "Frete manual e Correios estruturados" },
          { Icon: PackageCheck, title: "Retirada sem frete", text: "Protocolo automático no checkout" },
          { Icon: ShieldCheck, title: "Compra segura", text: "Auth.js, Zod, CSRF e rate limit" },
          { Icon: CheckCircle2, title: "Estoque real", text: "Baixa automática após pagamento" },
        ].map(({ Icon, title, text }) => (
          <div key={title} className="surface flex gap-3 p-4">
            <Icon className="text-[var(--brand)]" size={22} />
            <div>
              <strong className="block">{title}</strong>
              <span className="text-sm text-[var(--muted)]">{text}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="container-x mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">Categorias</h2>
          <p className="mt-2 text-[var(--muted)]">Suplementos, vitaminas, roupas fitness com tamanhos e acessórios para sua rotina.</p>
          </div>
          <Link href="/catalogo" className="btn btn-secondary">Ver catálogo</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.id} href={`/catalogo?category=${category.slug}`} className="group relative min-h-48 overflow-hidden rounded-lg bg-[var(--ink)] p-5 text-white">
              {category.imageUrl && <Image src={category.imageUrl} alt={category.name} fill sizes="33vw" className="object-cover opacity-60 transition-transform group-hover:scale-105" />}
              <span className="relative text-2xl font-black">{category.name}</span>
              <p className="relative mt-2 max-w-sm text-sm leading-6 text-white/85">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x mt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">Produtos em destaque</h2>
            <p className="mt-2 text-[var(--muted)]">Selecionados para performance, recuperação e rotina.</p>
          </div>
          <Link href="/catalogo?sort=featured" className="btn btn-secondary">Ver todos</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      {promo && (
        <section className="container-x mt-16">
          <div className="relative overflow-hidden rounded-lg bg-[var(--ink)] p-8 text-white md:p-12">
            <Image src={promo.imageUrl} alt={promo.title} fill sizes="100vw" className="object-cover opacity-45" />
            <div className="relative max-w-xl">
              <h2 className="text-3xl font-black md:text-5xl">{promo.title}</h2>
              <p className="mt-4 text-lg leading-8 text-white/85">{promo.subtitle}</p>
              <Link href={promo.ctaHref ?? "/catalogo"} className="btn mt-6 bg-white text-[var(--ink)]">{promo.ctaLabel ?? "Ver agora"}</Link>
            </div>
          </div>
        </section>
      )}

      <section className="container-x mt-16">
        <div className="mb-6">
          <h2 className="text-3xl font-black">Mais vendidos</h2>
          <p className="mt-2 text-[var(--muted)]">Itens que mais saem na loja online da XNutri.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {bestSellers.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="container-x mt-16 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="text-3xl font-black">Avaliações</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.id} className="surface p-5">
                <div className="text-[var(--accent)]">★★★★★</div>
                <h3 className="mt-3 font-black">{review.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{review.comment}</p>
                <span className="mt-3 block text-xs font-bold text-[var(--muted)]">{review.product.name}</span>
              </article>
            ))}
          </div>
        </div>
        <form action={subscribeNewsletter} className="surface self-start p-5">
          <h2 className="text-2xl font-black">Newsletter</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Receba promoções, reposição de estoque e campanhas da XNutri.</p>
          <input className="field mt-4" type="email" name="email" placeholder="seu@email.com" required />
          <button className="btn btn-primary mt-3 w-full" type="submit">Cadastrar</button>
        </form>
      </section>
    </>
  );
}
