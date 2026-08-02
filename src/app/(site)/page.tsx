import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BadgePercent,
  Clock3,
  Dumbbell,
  MapPin,
  Shirt,
} from "lucide-react";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { ProductCard } from "@/components/product/product-card";
import { prisma } from "@/lib/db/prisma";
import { demoFallbackOrThrow } from "@/lib/db/errors";
import { hasProductAvailableStock } from "@/lib/ecommerce/product-stock";
import { fallbackProducts } from "@/lib/fallback/catalog";
import { getWhatsAppHref } from "@/lib/whatsapp";

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
};

type SettingValue = Record<string, string | number | boolean | null | undefined>;

const heroTitle = "Suplementos, roupas fitness e retirada rápida em Mirassol";
const heroSubtitle = "Compre pelo site, tire dúvidas no WhatsApp e retire na loja sem frete.";

const quickLinks = [
  { href: "/catalogo?category=suplementos", label: "Suplementos", detail: "Whey, creatina e vitaminas", Icon: Dumbbell },
  { href: "/catalogo?category=roupas-fitness", label: "Moda fitness", detail: "Roupas para treino", Icon: Shirt },
  { href: "/catalogo?sort=discounts", label: "Ofertas", detail: "Preços especiais", Icon: BadgePercent },
  { href: "/retirada-na-loja", label: "Retirada", detail: "Sem frete em Mirassol", Icon: MapPin },
];

const pickupSteps = ["Escolha seus produtos", "Pague online", "Retire sem frete"];

function getText(value: unknown, key: string, fallback = "") {
  if (!value || typeof value !== "object") return fallback;
  const item = (value as SettingValue)[key];
  return item === undefined || item === null ? fallback : String(item);
}

function isLegacyHeroTitle(value: string) {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  return [
    "xnutri suplementos nutricionais",
    "performance, saúde e estilo em um só lugar.",
    "suplementos e moda fitness em mirassol",
  ].includes(normalized);
}

function isLegacyHeroSubtitle(value: string) {
  const normalized = value.toLocaleLowerCase("pt-BR");
  return normalized.includes("para quem treina de verdade") || normalized === "compre online, retire na loja ou receba na região.";
}

export default async function Home() {
  const fallbackReviews = [
    {
      id: "fallback-review-1",
      rating: 5,
      title: "Retirei no mesmo dia",
      comment: "Comprei creatina pelo site e retirei no mesmo dia. O atendimento pelo WhatsApp foi rápido.",
      product: { name: "Creatina" },
      user: { name: "Cliente de Mirassol" },
    },
    {
      id: "fallback-review-2",
      rating: 5,
      title: "Dúvida resolvida pelo WhatsApp",
      comment: "Comprei uma legging e tirei dúvida sobre o tamanho antes pelo WhatsApp. Foi bem tranquilo.",
      product: { name: "Moda fitness" },
      user: { name: "Cliente de Mirassol" },
    },
  ];

  const data = await Promise.all([
    prisma.banner.findFirst({ where: { location: "HOME_PROMO", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.banner.findFirst({ where: { location: "HOME_HERO", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.storeSetting.findUnique({ where: { key: "home" } }),
    prisma.storeSetting.findUnique({ where: { key: "store" } }),
    prisma.product.findMany({
      where: { status: "ACTIVE", featured: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: true, inventory: true },
      take: 12,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", bestSeller: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: true, inventory: true },
      take: 12,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", OR: [{ promotion: true }, { compareAtPrice: { not: null } }] },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: true, inventory: true },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    prisma.review.findMany({
      where: { approved: true },
      include: { product: { select: { name: true } }, user: { select: { name: true } } },
      take: 2,
      orderBy: { createdAt: "desc" },
    }),
  ]).catch((error) => demoFallbackOrThrow(error, () => null));

  const [promo, homeHero, homeSetting, storeSetting, storedFeatured, storedBestSellers, storedDiscountProducts, reviews] = data ?? [
    {
      title: "Compre online e retire em Mirassol",
      subtitle: "Faça seu pedido pelo site e retire na loja sem pagar frete.",
      imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1800&q=85",
      ctaLabel: "Ver produtos",
      ctaHref: "/catalogo",
    },
    {
      title: heroTitle,
      subtitle: heroSubtitle,
      imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&q=85",
      ctaLabel: "Ver produtos",
      ctaHref: "/catalogo",
    },
    null,
    null,
    fallbackProducts,
    fallbackProducts,
    fallbackProducts.filter((product) => product.promotion || product.compareAtPrice),
    fallbackReviews,
  ];

  const homeContent = (homeSetting?.value ?? {}) as HomeContent;
  const configuredTitle = homeContent.heroTitle ?? homeHero?.title ?? heroTitle;
  const configuredSubtitle = homeContent.heroSubtitle ?? homeHero?.subtitle ?? heroSubtitle;
  const displayedHeroTitle = isLegacyHeroTitle(configuredTitle) ? heroTitle : configuredTitle;
  const displayedHeroSubtitle = isLegacyHeroSubtitle(configuredSubtitle) ? heroSubtitle : configuredSubtitle;
  const heroPrimaryLabel = homeContent.heroPrimaryLabel ?? homeHero?.ctaLabel ?? "Ver produtos";
  const heroPrimaryHref = homeContent.heroPrimaryHref ?? homeHero?.ctaHref ?? "/catalogo";
  const promoIsLegacy = promo?.title.trim().toLocaleLowerCase("pt-BR") === "vitrine fitness xnutri";
  const promoTitle = promoIsLegacy ? "Compre online e retire em Mirassol" : promo?.title;
  const promoSubtitle = promoIsLegacy
    ? "Faça seu pedido pelo site e retire na loja sem pagar frete."
    : promo?.subtitle;
  const configuredPromoLabel = promo?.ctaLabel?.trim();
  const promoLabel = promoIsLegacy || !configuredPromoLabel || configuredPromoLabel === "Ver produtos"
    ? "Escolher produtos"
    : configuredPromoLabel;
  const promoHref = promoIsLegacy ? "/catalogo" : (promo?.ctaHref ?? "/catalogo");
  const whatsappHref = getWhatsAppHref(
    getText(storeSetting?.value, "whatsapp", "5517997000000"),
    "Olá! Vim pelo site da XNutri e preciso de ajuda com uma compra.",
  );

  const featured = storedFeatured.filter(hasProductAvailableStock).slice(0, 4);
  const featuredIds = new Set(featured.map((product) => product.id));
  const discountProducts = storedDiscountProducts
    .filter((product) => hasProductAvailableStock(product) && !featuredIds.has(product.id))
    .slice(0, 4);
  const shownIds = new Set([...featuredIds, ...discountProducts.map((product) => product.id)]);
  const bestSellers = storedBestSellers
    .filter((product) => hasProductAvailableStock(product) && !shownIds.has(product.id))
    .slice(0, 4);
  const displayReviews = [
    ...reviews.map((review, index) => {
      const isGenericSeedReview = [
        "Entrega rápida e produto aprovado",
        "Bom custo-benefício",
        "Retirei no mesmo dia",
        "Dúvida resolvida pelo WhatsApp",
      ].includes(review.title);
      if (!isGenericSeedReview) return review;
      const replacement = fallbackReviews[index % fallbackReviews.length];
      return { ...review, rating: replacement.rating, title: replacement.title, comment: replacement.comment, product: replacement.product, user: replacement.user };
    }),
    ...fallbackReviews,
  ].filter((review, index, items) => items.findIndex((item) => item.comment === review.comment) === index).slice(0, 2);

  return (
    <>
      <section data-home-section="hero" className="border-b border-[var(--line)] bg-white">
        <div className="container-x grid gap-5 py-4 md:grid-cols-[1fr_0.82fr] md:items-center md:gap-12 md:py-10">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-dark)]">XNutri Mirassol</span>
            <h1 className="mt-1.5 max-w-xl text-[1.65rem] font-bold leading-[1.04] tracking-[-0.03em] text-[var(--ink)] sm:text-4xl sm:leading-[1.08] md:text-5xl">
              {displayedHeroTitle}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-5 text-[var(--muted)] sm:text-base sm:leading-6 md:text-lg">{displayedHeroSubtitle}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 md:mt-4">
              <Link href={heroPrimaryHref} className="btn btn-primary px-3 sm:px-4">{heroPrimaryLabel}</Link>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn btn-secondary px-3 sm:px-4">Falar no WhatsApp</a>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[var(--muted)] md:mt-3">
              <span>Loja física em Mirassol/SP</span><span aria-hidden="true">·</span><span>Retirada sem frete</span>
            </p>
          </div>

          {homeHero?.imageUrl && (
            <div className="relative hidden aspect-[16/10] overflow-hidden rounded-lg bg-[#eeece8] md:block">
              <Image src={homeHero.imageUrl} alt={homeHero.title} fill loading="eager" fetchPriority="high" sizes="42vw" className="object-cover" />
            </div>
          )}
        </div>
      </section>

      <section data-home-section="quick-links" className="border-b border-[var(--line)] bg-[#faf9f7] py-4 md:py-5">
        <div className="container-x grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {quickLinks.map(({ href, label, detail, Icon }) => (
            <Link key={href} href={href} className="group flex min-h-20 items-center gap-3 rounded-lg border border-[var(--line)] bg-white p-3 transition-colors hover:border-[#e8aaa5]">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#fff3f1] text-[var(--brand-dark)]">
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <strong className="block text-sm leading-5">{label}</strong>
                <span className="mt-0.5 block text-[11px] leading-4 text-[var(--muted)] sm:text-xs">{detail}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section data-home-section="featured" className="container-x py-7 md:py-12">
          <div className="mb-4 flex items-end justify-between gap-3 md:mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight md:text-3xl">Destaques da loja</h2>
              <p className="mt-1 text-sm text-[var(--muted)] md:text-base">Suplementos e roupas fitness para comprar agora.</p>
            </div>
            <Link href="/catalogo" className="shrink-0 text-sm font-semibold text-[var(--brand-dark)] hover:underline">Ver todos</Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-4">
            {featured.map((product, index) => <ProductCard key={product.id} product={product} eager={index < 2} />)}
          </div>
        </section>
      )}

      {discountProducts.length > 0 && (
        <section data-home-section="offers" className="container-x py-8 md:py-12">
          <div className="mb-4 flex items-end justify-between gap-3 md:mb-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-dark)]">Preços especiais</span>
              <h2 className="mt-1 text-xl font-bold tracking-tight md:text-3xl">Ofertas</h2>
            </div>
            <Link href="/catalogo?sort=discounts" className="text-sm font-semibold text-[var(--brand-dark)] hover:underline">Ver ofertas</Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-4">
            {discountProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}

      {promo && (
        <section data-home-section="pickup" className="container-x pb-8 md:pb-12">
          <div className="grid overflow-hidden rounded-lg border border-[#efc7c3] bg-[#fff7f6] md:grid-cols-[1fr_280px]">
            <div className="flex flex-col justify-center p-5 md:p-7">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-dark)]"><Clock3 size={15} /> Retirada em Mirassol</span>
              <h2 className="mt-2 text-xl font-bold md:text-2xl">{promoTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{promoSubtitle}</p>
              <ol className="mt-4 grid grid-cols-3 gap-2 border-y border-[#efc7c3] py-3">
                {pickupSteps.map((step, index) => (
                  <li key={step} className="text-xs font-semibold leading-4 text-[var(--graphite)] sm:text-sm">
                    <span className="mb-1 block text-[var(--brand-dark)]">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <Link href={promoHref} className="mt-4 text-sm font-semibold text-[var(--brand-dark)] hover:underline">{promoLabel}</Link>
            </div>
            <div className="relative hidden min-h-48 bg-[#e4e1dc] md:block">
              <Image src={promo.imageUrl} alt={promo.title} fill sizes="280px" className="object-cover" />
            </div>
          </div>
        </section>
      )}

      {bestSellers.length > 0 && (
        <section data-home-section="best-sellers" className="container-x pb-8 md:pb-12">
          <div className="mb-4 md:mb-6">
            <h2 className="text-xl font-bold tracking-tight md:text-3xl">Mais vendidos</h2>
            <p className="mt-1 text-sm text-[var(--muted)] md:text-base">Os produtos mais comprados na XNutri.</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-4">
            {bestSellers.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}

      <section data-home-section="reviews" className="border-t border-[var(--line)] bg-white py-8 md:py-12">
        <div className="container-x grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="text-xl font-bold tracking-tight md:text-3xl">Avaliações de clientes</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Experiências de compra, entrega e retirada.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {displayReviews.map((review) => (
                <article key={review.id} className="rounded-lg border border-[var(--line)] p-4">
                  <div className="text-xs font-semibold text-[var(--brand-dark)]" aria-label={`${review.rating} de 5 estrelas`}>★ {review.rating}/5
                  </div>
                  <h3 className="mt-2 text-sm font-bold">{review.title}</h3>
                  <p className="mt-1.5 text-sm leading-5 text-[var(--muted)]">{review.comment}</p>
                  <span className="mt-3 block text-xs font-semibold text-[var(--muted)]">
                    {review.user?.name ?? "Compra verificada"} · {review.product.name}
                  </span>
                </article>
              ))}
            </div>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
