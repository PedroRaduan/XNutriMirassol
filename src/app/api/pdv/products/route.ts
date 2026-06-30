import { NextResponse, type NextRequest } from "next/server";
import { requirePOS } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type POSProductRow = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  displayName: string;
  sku: string;
  barcode: string | null;
  ean: string | null;
  internalCode: string | null;
  category: string;
  imageUrl: string | null;
  price: number;
  stock: number;
  lowStock: boolean;
  exact: boolean;
};

function sameCode(a: string | null | undefined, b: string) {
  return a?.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  await requirePOS();
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const take = q.length >= 2 ? 18 : 12;

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
              { ean: { contains: q, mode: "insensitive" } },
              { internalCode: { contains: q, mode: "insensitive" } },
              { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
              { variants: { some: { barcode: { contains: q, mode: "insensitive" } } } },
              { variants: { some: { ean: { contains: q, mode: "insensitive" } } } },
              { variants: { some: { internalCode: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : { OR: [{ bestSeller: true }, { featured: true }, { promotion: true }] }),
    },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      inventory: true,
      variants: { where: { active: true }, include: { inventory: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ bestSeller: "desc" }, { featured: "desc" }, { name: "asc" }],
    take,
  });

  const rows: POSProductRow[] = products.flatMap((product): POSProductRow[] => {
    const imageUrl = product.images[0]?.url ?? null;

    if (product.variants.length > 0) {
      return product.variants.map((variant) => {
        const inventory = variant.inventory ?? product.inventory.find((entry) => entry.variantId === variant.id);
        const stock = inventory ? inventory.quantity - inventory.reserved : 0;
        const codes = [variant.sku, variant.barcode, variant.ean, variant.internalCode, product.sku, product.barcode, product.ean, product.internalCode];
        return {
          id: `${product.id}:${variant.id}`,
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          variantName: variant.name,
          displayName: `${product.name} - ${variant.name}`,
          sku: variant.sku,
          barcode: variant.barcode ?? product.barcode,
          ean: variant.ean ?? product.ean,
          internalCode: variant.internalCode ?? product.internalCode,
          category: product.category.name,
          imageUrl,
          price: toNumber(product.price) + toNumber(variant.priceAdjustment),
          stock,
          lowStock: inventory ? stock <= inventory.lowStockThreshold : true,
          exact: q.length > 0 && codes.some((code) => sameCode(code, q)),
        };
      });
    }

    const inventory = product.inventory.find((entry) => entry.variantId === null) ?? product.inventory[0];
    const stock = inventory ? inventory.quantity - inventory.reserved : 0;
    const codes = [product.sku, product.barcode, product.ean, product.internalCode];
    return [
      {
        id: product.id,
        productId: product.id,
        variantId: null,
        name: product.name,
        variantName: null,
        displayName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        ean: product.ean,
        internalCode: product.internalCode,
        category: product.category.name,
        imageUrl,
        price: toNumber(product.price),
        stock,
        lowStock: inventory ? stock <= inventory.lowStockThreshold : true,
        exact: q.length > 0 && codes.some((code) => sameCode(code, q)),
      },
    ];
  });

  return NextResponse.json({ products: rows, exactCount: rows.filter((row) => row.exact).length });
}
