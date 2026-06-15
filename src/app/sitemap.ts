import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { getBaseUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const staticRoutes = [
    "",
    "/catalogo",
    "/sobre",
    "/contato",
    "/faq",
    "/trocas",
    "/privacidade",
    "/termos",
    "/entrega",
    "/retirada-na-loja",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.7,
  }));

  if (!process.env.DATABASE_URL) {
    return staticRoutes;
  }

  try {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    ]);

    return [
      ...staticRoutes,
      ...categories.map((category) => ({
        url: `${baseUrl}/catalogo?category=${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...products.map((product) => ({
        url: `${baseUrl}/produto/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
