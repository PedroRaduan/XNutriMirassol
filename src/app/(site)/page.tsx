import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Dumbbell,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { XNutriLogo } from "@/components/layout/xnutri-logo";
import { prisma } from "@/lib/db/prisma";
import { demoFallbackOrThrow } from "@/lib/db/errors";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { fallbackCategories, fallbackProducts, storefrontCategorySlugs } from "@/lib/fallback/catalog";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suplementos e Moda Fitness em Mirassol",
  description: "Compre suplementos, moda fitness e acessórios na XNutri Mirassol. Retire na loja, receba com praticidade e fale pelo WhatsApp.",
  alternates: { canonical: "/" },
};

type HomeContent = {
  heroTitle?: string;
  heroSubtitle?: string;
  heroPrimaryLabel?: string;
  heroPrimaryHref?: string;
  heroSecondaryLabel?: string;
  heroSecondaryHref?: string;
};

const heroTitle = "Performance, saúde e estilo em um só lugar.";
const heroSubtitle =
  "Suplementos, roupas fitness e acessórios para quem treina de verdade. Compre online e retire na loja em Mirassol.";

const benefitCards = [
  { Icon: Dumbbell, title: "Performance real", text: "Whey, creatina, pré-treinos e vitaminas para evoluir." },
  { Icon: ShoppingBag, title: "Moda fitness", text: "Peças confortáveis para treinar com mobilidade e estilo." },
  { Icon: PackageCheck, title: "Retirada sem frete", text: "Escolha retirar na loja e receba protocolo no checkout." },
  { Icon: ShieldCheck, title: "Compra segura", text: "Pagamento protegido, checkout validado e acompanhamento do pedido." },
];

export default async function Home() {
  const fallbackReviews = [
    {
      id: "fallback-review-1",
      title: "Atendimento excelente",
      comment: "Loja bonita, com suplementos e roupas fitness bem apresentados.",
      product: { name: "Xnutri Mirassol" },
    },
    {
      id: "fallback-review-2",
      title: "Retirada prática",
      comment: "Comprar online e retirar na loja facilita bastante a rotina.",
      product: { name: "Retirada na loja" },
    },
    {
      id: "fallback-review-3",
      title: "Moda fitness confortável",
      comment: "Gostei da variedade de roupas e da facilidade para comprar pelo site.",
      product: { name: "Roupas Fitness" },
    },
  ];

  const data = await Promise.all([
    prisma.banner.findFirst({ where: { location: "HOME_PROMO", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.banner.findFirst({ where: { location: "HOME_HERO", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.storeSetting.findUnique({ where: { key: "home" } }),
    prisma.category.findMany({
      where: { active: true, slug: { in: storefrontCategorySlugs } },
      orderBy: { sortOrder: "asc" },
      take: 2,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", featured: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: true, inventory: true },
      take: 4,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", bestSeller: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: true, inventory: true },
      take: 4,
    }),
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ promotion: true }, { compareAtPrice: { not: null } }],
      },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: true, inventory: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.review.findMany({
      where: { approved: true },
      include: { product: { select: { name: true } } },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
  ]).catch((error) => demoFallbackOrThrow(error, () => null));

  const [promo, homeHero, homeSetting, storedCategories, featured, bestSellers, discountProducts, reviews] = data ?? [
    {
      title: "Vitrine fitness Xnutri",
      subtitle: "Roupas fitness, suplementos e acessórios para comprar online e retirar na loja.",
      imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1800&q=85",
      ctaLabel: "Ver roupas",
      ctaHref: "/catalogo?category=roupas-fitness",
    },
    {
      title: "Xnutri Suplementos Nutricionais",
      subtitle: heroSubtitle,
      imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&q=85",
      ctaLabel: "Comprar agora",
      ctaHref: "/catalogo",
    },
    null,
    fallbackCategories,
    fallbackProducts,
    fallbackProducts,
    fallbackProducts.filter((product) => product.promotion || product.compareAtPrice),
    fallbackReviews,
  ];
  const homeContent = (homeSetting?.value ?? {}) as HomeContent;
  const currentHeroTitle = homeContent.heroTitle ?? homeHero?.title ?? heroTitle;
  const currentHeroSubtitle = homeContent.heroSubtitle ?? homeHero?.subtitle ?? heroSubtitle;
  const heroPrimaryLabel = homeContent.heroPrimaryLabel ?? homeHero?.ctaLabel ?? "Ver produtos";
  const heroPrimaryHref = homeContent.heroPrimaryHref ?? homeHero?.ctaHref ?? "/catalogo";
  const heroSecondaryLabel = homeContent.heroSecondaryLabel ?? "Retirar na loja";
  const heroSecondaryHref = homeContent.heroSecondaryHref ?? "/retirada-na-loja";
  const categories = storedCategories.length === 2 ? storedCategories : fallbackCategories;
  const heroProducts = (featured.length > 0 ? featured : fallbackProducts).slice(0, 3);

  return (
    <>
      <section className="hero-xnutri">
        {homeHero?.imageUrl && <Image src={homeHero.imageUrl} alt={homeHero.title} fill priority sizes="100vw" className="object-cover opacity-20" />}
        <div className="container-x relative z-10 py-10 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_430px]">
            <div className="animate-hero max-w-3xl">
              <XNutriLogo tone="light" />
              <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-black uppercase text-white/80 sm:mt-8 sm:text-xs">
                <Sparkles size={14} className="text-[#ffd2cc]" />
                Mirassol-SP · treino e estilo
              </span>
              <h1 className="mt-4 max-w-3xl text-[2.55rem] font-black leading-[0.98] sm:text-5xl md:text-7xl">{currentHeroTitle}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 md:text-xl">{currentHeroSubtitle}</p>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <Link href={heroPrimaryHref} className="btn bg-white text-[var(--ink)] hover:bg-[#f3f4f6]">
                  {heroPrimaryLabel} <ArrowRight size={18} />
                </Link>
                <Link href={heroSecondaryHref} className="btn border border-white/20 bg-white/10 text-white hover:bg-white/15">
                  {heroSecondaryLabel} <MapPin size={18} />
                </Link>
              </div>
            </div>

            <div className="hero-panel animate-hero hidden p-4 md:p-5 lg:block">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-black uppercase text-white/60">Vitrine XNutri</span>
                  <h2 className="mt-1 text-2xl font-black">Pronto para o treino</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--brand)]">Online + loja</span>
              </div>
              <div className="mt-4 grid gap-3">
                {heroProducts.map((product) => {
                  const image = product.images[0];
                  return (
                    <Link key={product.id} href={`/produto/${product.slug}`} className="group grid grid-cols-[74px_1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/10 p-2.5 hover:bg-white/15">
                      <div className="relative aspect-square overflow-hidden rounded-md bg-white/10">
                        {image && <Image src={image.url} alt={image.alt} fill sizes="74px" className="object-cover transition-transform duration-300 group-hover:scale-105" />}
                      </div>
                      <div>
                        <strong className="line-clamp-2 text-sm leading-5">{product.name}</strong>
                        <span className="mt-1 block text-xs text-white/60">{product.sku}</span>
                      </div>
                      <strong className="text-sm">{formatCurrency(product.price)}</strong>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {benefitCards.map(({ Icon, title, text }) => (
              <div key={title} className="reveal-card rounded-lg border border-white/15 bg-white/10 p-4 text-white backdrop-blur">
                <Icon className="text-[#ffd2cc]" size={22} />
                <strong className="mt-3 block">{title}</strong>
                <span className="mt-1 block text-sm leading-6 text-white/70">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x mt-10 md:mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black md:text-3xl">Categorias</h2>
            <p className="mt-2 text-[var(--muted)]">Suplementos, moda fitness e acessórios para sua rotina render mais.</p>
          </div>
          <Link href="/catalogo" className="btn btn-secondary hidden sm:inline-flex">Ver catálogo</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((category) => (
            <Link key={category.id} href={`/catalogo?category=${category.slug}`} className="reveal-card group relative min-h-52 overflow-hidden rounded-lg bg-[var(--ink)] p-5 text-white shadow-xl">
              {category.imageUrl && <Image src={category.imageUrl} alt={category.name} fill sizes="33vw" className="object-cover opacity-60 transition-transform duration-500 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <span className="relative text-2xl font-black">{category.name}</span>
              <p className="relative mt-2 max-w-sm text-sm leading-6 text-white/80">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x mt-12 md:mt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black md:text-3xl">Produtos em destaque</h2>
            <p className="mt-2 text-[var(--muted)]">Selecionados para performance, recuperação e rotina.</p>
          </div>
          <Link href="/catalogo?sort=featured" className="btn btn-secondary hidden sm:inline-flex">Ver todos</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {featured.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="container-x mt-12 md:mt-16">
        <div className="relative overflow-hidden rounded-lg bg-[var(--brand)] p-5 text-white shadow-2xl md:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-dark)] via-[var(--brand)] to-[var(--brand-hot)] opacity-95" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="badge border-transparent bg-white text-[var(--brand)]">Ofertas XNutri</span>
              <h2 className="mt-4 text-2xl font-black md:text-4xl">Produtos com desconto</h2>
              <p className="mt-2 max-w-2xl text-white/70">
                Ofertas selecionadas em suplementos, moda fitness e acessórios. Aproveite enquanto houver estoque disponível.
              </p>
            </div>
            <Link href="/catalogo?sort=discounts" className="btn bg-white text-[var(--ink)] hover:bg-[#f3f4f6]">
              Ver descontos <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-5 lg:grid-cols-4">
          {discountProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      {promo && (
        <section className="container-x mt-12 md:mt-16">
          <div className="relative overflow-hidden rounded-lg bg-[var(--ink)] p-8 text-white shadow-2xl md:p-12">
            <Image src={promo.imageUrl} alt={promo.title} fill sizes="100vw" className="object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="relative max-w-xl">
              <span className="badge border-transparent bg-white text-[var(--brand)]">Promoção XNutri</span>
              <h2 className="mt-4 text-3xl font-black md:text-5xl">{promo.title}</h2>
              <p className="mt-4 text-lg leading-8 text-white/80">{promo.subtitle}</p>
              <Link href={promo.ctaHref ?? "/catalogo"} className="btn mt-6 bg-white text-[var(--ink)]">{promo.ctaLabel ?? "Ver agora"}</Link>
            </div>
          </div>
        </section>
      )}

      <section className="container-x mt-12 md:mt-16">
        <div className="mb-6">
          <h2 className="text-2xl font-black md:text-3xl">Mais vendidos</h2>
          <p className="mt-2 text-[var(--muted)]">Itens que mais saem na loja online da XNutri.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {bestSellers.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="container-x mt-12 grid gap-5 md:mt-16 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="text-2xl font-black md:text-3xl">Avaliações</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.id} className="surface reveal-card p-5">
                <div className="flex text-[var(--brand)]">
                  {[1, 2, 3, 4, 5].map((item) => <Star key={item} size={16} fill="currentColor" />)}
                </div>
                <h3 className="mt-3 font-black">{review.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{review.comment}</p>
                <span className="mt-3 block text-xs font-bold text-[var(--muted)]">{review.product.name}</span>
              </article>
            ))}
          </div>
        </div>
        <NewsletterForm />
      </section>
    </>
  );
}
