"use server";

import type { AdminModule } from "@/lib/auth/session";
import type { OrderStatus, Prisma } from "@prisma/client";
import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isDatabaseUnavailable } from "@/lib/db/errors";
import { decrementInventoryForOrder } from "@/lib/ecommerce/inventory";
import { assertSameOrigin, getClientIp } from "@/lib/security/request";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import {
  bannerAdminSchema,
  categoryAdminSchema,
  couponAdminSchema,
  financialSettingsAdminSchema,
  homeContentAdminSchema,
  orderAdminSchema,
  pickupLocationAdminSchema,
  productAdminSchema,
  productVariantAdminSchema,
  shippingMethodAdminSchema,
  storeSettingsAdminSchema,
} from "@/lib/validations";

const orderStatuses: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PREPARING",
  "AWAITING_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
  "REFUNDED",
];

function slug(value: string) {
  return slugify(value, { lower: true, strict: true, locale: "pt" });
}

function emptyToUndefined(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : undefined;
}

function optionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function splitImageUrls(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIdList(formData: FormData, key: string) {
  const fromMulti = formData.getAll(key).map(String).filter(Boolean);
  if (fromMulti.length > 0) return fromMulti;

  return String(formData.get(key) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAttributes(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as Prisma.InputJsonValue;
  }

  const attributes = Object.fromEntries(
    trimmed
      .split(/\r?\n|;/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [rawKey, ...rawValue] = line.split("=");
        return [sanitizeText(rawKey ?? ""), sanitizeText(rawValue.join("=") || "Sim")];
      })
      .filter(([key]) => key),
  );

  return attributes as Prisma.InputJsonValue;
}

async function withAdmin(module: AdminModule, write = true) {
  await assertSameOrigin();
  return requireAdmin(module, write);
}

async function audit(
  adminUserId: string | undefined,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Prisma.InputJsonValue,
) {
  const ipAddress = await getClientIp();

  await prisma.auditLog.create({
    data: {
      adminUserId,
      action,
      entity,
      entityId,
      metadata,
      ipAddress,
    },
  });
}

function duplicateMessage(entity: string) {
  return `${entity} ja existe com slug, SKU ou codigo informado.`;
}

export async function upsertProduct(formData: FormData) {
  const admin = await withAdmin("products");
  const parsed = productAdminSchema.safeParse({
    id: emptyToUndefined(formData.get("id")),
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    slug: emptyToUndefined(formData.get("slug")),
    sku: formData.get("sku"),
    barcode: emptyToUndefined(formData.get("barcode")),
    ean: emptyToUndefined(formData.get("ean")),
    internalCode: emptyToUndefined(formData.get("internalCode")),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    price: formData.get("price"),
    compareAtPrice: emptyToUndefined(formData.get("compareAtPrice")),
    costPrice: emptyToUndefined(formData.get("costPrice")),
    packagingCost: emptyToUndefined(formData.get("packagingCost")),
    desiredMargin: emptyToUndefined(formData.get("desiredMargin")),
    estimatedTaxRate: emptyToUndefined(formData.get("estimatedTaxRate")),
    status: formData.get("status") || "ACTIVE",
    imageUrls: formData.get("imageUrls") || formData.get("imageUrl"),
    featured: formData.get("featured") === "on",
    bestSeller: formData.get("bestSeller") === "on",
    promotion: formData.get("promotion") === "on",
    stock: formData.get("stock") || 0,
    lowStockThreshold: emptyToUndefined(formData.get("lowStockThreshold")),
    weightGrams: formData.get("weightGrams") || 300,
    widthCm: formData.get("widthCm") || 16,
    heightCm: formData.get("heightCm") || 22,
    lengthCm: formData.get("lengthCm") || 16,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Produto invalido.");
  }

  const data = parsed.data;
  const images = splitImageUrls(data.imageUrls);
  const productSlug = data.slug ? slug(data.slug) : slug(data.name);
  const before = data.id
    ? await prisma.product.findUnique({
        where: { id: data.id },
        include: { images: true, inventory: true, variants: true },
      })
    : null;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const productData = {
        categoryId: data.categoryId,
        name: sanitizeText(data.name),
        slug: productSlug,
        sku: sanitizeText(data.sku),
        barcode: data.barcode ? sanitizeText(data.barcode) : null,
        ean: data.ean ? sanitizeText(data.ean) : null,
        internalCode: data.internalCode ? sanitizeText(data.internalCode) : null,
        shortDescription: sanitizeText(data.shortDescription),
        description: sanitizeText(data.description),
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        costPrice: data.costPrice,
        packagingCost: data.packagingCost,
        desiredMargin: data.desiredMargin,
        estimatedTaxRate: data.estimatedTaxRate,
        status: data.status,
        featured: Boolean(data.featured),
        bestSeller: Boolean(data.bestSeller),
        promotion: Boolean(data.promotion),
        weightGrams: data.weightGrams,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        lengthCm: data.lengthCm,
        metaTitle: `${sanitizeText(data.name)} | XNutri`,
        metaDescription: sanitizeText(data.shortDescription),
      };

      const saved = data.id
        ? await tx.product.update({
            where: { id: data.id },
            data: {
              ...productData,
              images: {
                deleteMany: {},
                create: images.map((url, index) => ({
                  url,
                  alt: data.name,
                  sortOrder: index + 1,
                })),
              },
            },
          })
        : await tx.product.create({
            data: {
              ...productData,
              images: {
                create: images.map((url, index) => ({
                  url,
                  alt: data.name,
                  sortOrder: index + 1,
                })),
              },
            },
          });

      let inventory = await tx.inventory.findFirst({
        where: { productId: saved.id },
        orderBy: { updatedAt: "asc" },
      });

      if (!inventory) {
        const variant = await tx.productVariant.create({
          data: {
            productId: saved.id,
            name: "Padrao",
            sku: `${data.sku}-PADRAO`,
            attributes: { tipo: "Padrao" },
            costPrice: data.costPrice,
            packagingCost: data.packagingCost,
          },
        });

        inventory = await tx.inventory.create({
          data: {
            productId: saved.id,
            variantId: variant.id,
            quantity: data.stock,
            lowStockThreshold: data.lowStockThreshold ?? 5,
            available: data.stock > 0,
          },
        });
      } else if (inventory.quantity !== data.stock || inventory.lowStockThreshold !== (data.lowStockThreshold ?? inventory.lowStockThreshold)) {
        const updated = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: data.stock,
            lowStockThreshold: data.lowStockThreshold ?? inventory.lowStockThreshold,
            available: data.stock > 0,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            createdById: admin.id,
            type: data.stock >= inventory.quantity ? "STOCK_IN" : "ADJUSTMENT",
            quantity: data.stock - inventory.quantity,
            reason: data.id ? "Ajuste pelo cadastro do produto" : "Estoque inicial do produto",
            balance: updated.quantity,
          },
        });
      }

      return saved;
    });

    await audit(admin.admin.id, data.id ? "product.update" : "product.create", "products", product.id, {
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: { id: product.id, name: product.name, sku: product.sku, price: String(product.price), status: product.status },
    });

    revalidatePath("/admin/produtos");
    revalidatePath("/admin/estoque");
    revalidatePath("/catalogo");
    revalidatePath(`/produto/${product.slug}`);
    revalidatePath("/");
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      throw new Error(duplicateMessage("Produto"));
    }
    throw error;
  }
}

export async function archiveProduct(formData: FormData) {
  const admin = await withAdmin("products");
  const id = String(formData.get("id") ?? "");
  const before = await prisma.product.findUnique({ where: { id } });

  const product = await prisma.product.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  await audit(admin.admin.id, "product.archive", "products", id, {
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: { status: "ARCHIVED" },
  });
  revalidatePath("/admin/produtos");
  revalidatePath("/catalogo");
  revalidatePath(`/produto/${product.slug}`);
}

export const deleteProduct = archiveProduct;

export async function upsertProductVariant(formData: FormData) {
  const admin = await withAdmin("products");
  const parsed = productVariantAdminSchema.safeParse({
    id: emptyToUndefined(formData.get("id")),
    productId: formData.get("productId"),
    name: formData.get("name"),
    sku: formData.get("sku"),
    barcode: emptyToUndefined(formData.get("barcode")),
    ean: emptyToUndefined(formData.get("ean")),
    internalCode: emptyToUndefined(formData.get("internalCode")),
    attributes: formData.get("attributes"),
    priceAdjustment: emptyToUndefined(formData.get("priceAdjustment")),
    costPrice: emptyToUndefined(formData.get("costPrice")),
    packagingCost: emptyToUndefined(formData.get("packagingCost")),
    stock: formData.get("stock") || 0,
    lowStockThreshold: emptyToUndefined(formData.get("lowStockThreshold")),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Variacao invalida.");

  const data = parsed.data;
  const before = data.id
    ? await prisma.productVariant.findUnique({ where: { id: data.id }, include: { inventory: true } })
    : null;

  try {
    const variant = await prisma.$transaction(async (tx) => {
      const saved = data.id
        ? await tx.productVariant.update({
            where: { id: data.id },
            data: {
              name: sanitizeText(data.name),
              sku: sanitizeText(data.sku),
              barcode: data.barcode ? sanitizeText(data.barcode) : null,
              ean: data.ean ? sanitizeText(data.ean) : null,
              internalCode: data.internalCode ? sanitizeText(data.internalCode) : null,
              attributes: parseAttributes(data.attributes),
              priceAdjustment: data.priceAdjustment ?? 0,
              costPrice: data.costPrice,
              packagingCost: data.packagingCost,
              active: Boolean(data.active),
            },
          })
        : await tx.productVariant.create({
            data: {
              productId: data.productId,
              name: sanitizeText(data.name),
              sku: sanitizeText(data.sku),
              barcode: data.barcode ? sanitizeText(data.barcode) : null,
              ean: data.ean ? sanitizeText(data.ean) : null,
              internalCode: data.internalCode ? sanitizeText(data.internalCode) : null,
              attributes: parseAttributes(data.attributes),
              priceAdjustment: data.priceAdjustment ?? 0,
              costPrice: data.costPrice,
              packagingCost: data.packagingCost,
              active: Boolean(data.active),
            },
          });

      const inventory = await tx.inventory.findUnique({ where: { variantId: saved.id } });
      if (!inventory) {
        const created = await tx.inventory.create({
          data: {
            productId: data.productId,
            variantId: saved.id,
            quantity: data.stock,
            lowStockThreshold: data.lowStockThreshold ?? 5,
            available: data.stock > 0,
          },
        });
        await tx.inventoryMovement.create({
          data: {
            inventoryId: created.id,
            createdById: admin.id,
            type: "STOCK_IN",
            quantity: data.stock,
            reason: "Estoque inicial da variacao",
            balance: data.stock,
          },
        });
      } else if (inventory.quantity !== data.stock || inventory.lowStockThreshold !== (data.lowStockThreshold ?? inventory.lowStockThreshold)) {
        const updated = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: data.stock,
            lowStockThreshold: data.lowStockThreshold ?? inventory.lowStockThreshold,
            available: data.stock > 0,
          },
        });
        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            createdById: admin.id,
            type: "ADJUSTMENT",
            quantity: data.stock - inventory.quantity,
            reason: "Ajuste pelo cadastro da variacao",
            balance: updated.quantity,
          },
        });
      }

      return saved;
    });

    await audit(admin.admin.id, data.id ? "variant.update" : "variant.create", "product_variants", variant.id, {
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: { id: variant.id, sku: variant.sku, active: variant.active },
    });
    revalidatePath("/admin/produtos");
    revalidatePath("/admin/estoque");
    revalidatePath("/catalogo");
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      throw new Error(duplicateMessage("Variacao"));
    }
    throw error;
  }
}

export async function deactivateProductVariant(formData: FormData) {
  const admin = await withAdmin("products");
  const id = String(formData.get("id") ?? "");
  const variant = await prisma.productVariant.update({ where: { id }, data: { active: false } });

  await audit(admin.admin.id, "variant.deactivate", "product_variants", id, { after: { active: false } });
  revalidatePath("/admin/produtos");
  revalidatePath(`/produto/${variant.productId}`);
}

export async function upsertCategory(formData: FormData) {
  const admin = await withAdmin("categories");
  const parsed = categoryAdminSchema.safeParse({
    id: emptyToUndefined(formData.get("id")),
    name: formData.get("name"),
    slug: emptyToUndefined(formData.get("slug")),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    active: formData.get("active") === "on",
    sortOrder: emptyToUndefined(formData.get("sortOrder")),
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Categoria invalida.");

  const data = parsed.data;
  const before = data.id ? await prisma.category.findUnique({ where: { id: data.id } }) : null;

  try {
    const category = data.id
      ? await prisma.category.update({
          where: { id: data.id },
          data: {
            name: sanitizeText(data.name),
            slug: data.slug ? slug(data.slug) : slug(data.name),
            description: sanitizeOptionalText(data.description),
            imageUrl: sanitizeOptionalText(data.imageUrl),
            active: Boolean(data.active),
            sortOrder: data.sortOrder ?? 0,
          },
        })
      : await prisma.category.create({
          data: {
            name: sanitizeText(data.name),
            slug: data.slug ? slug(data.slug) : slug(data.name),
            description: sanitizeOptionalText(data.description),
            imageUrl: sanitizeOptionalText(data.imageUrl),
            active: Boolean(data.active),
            sortOrder: data.sortOrder ?? 0,
          },
        });

    await audit(admin.admin.id, data.id ? "category.update" : "category.create", "categories", category.id, {
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: { id: category.id, name: category.name, active: category.active },
    });
    revalidatePath("/admin/categorias");
    revalidatePath("/catalogo");
    revalidatePath("/");
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      throw new Error(duplicateMessage("Categoria"));
    }
    throw error;
  }
}

export const createCategory = upsertCategory;

export async function deactivateCategory(formData: FormData) {
  const admin = await withAdmin("categories");
  const id = String(formData.get("id") ?? "");

  await prisma.category.update({
    where: { id },
    data: { active: false },
  });

  await audit(admin.admin.id, "category.deactivate", "categories", id, { after: { active: false } });
  revalidatePath("/admin/categorias");
  revalidatePath("/catalogo");
  revalidatePath("/");
}

export async function adjustInventory(formData: FormData) {
  const admin = await withAdmin("inventory");
  const inventoryId = String(formData.get("inventoryId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const lowStockThresholdRaw = emptyToUndefined(formData.get("lowStockThreshold"));
  const reason = sanitizeText(String(formData.get("reason") ?? "Ajuste manual"));

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Estoque não pode ser negativo.");
  }

  const inventory = await prisma.inventory.findUniqueOrThrow({ where: { id: inventoryId } });
  const updated = await prisma.inventory.update({
    where: { id: inventoryId },
    data: {
      quantity,
      lowStockThreshold: lowStockThresholdRaw ? Number(lowStockThresholdRaw) : inventory.lowStockThreshold,
      available: quantity > 0,
    },
  });

  await prisma.inventoryMovement.create({
    data: {
      inventoryId,
      createdById: admin.id,
      type: "ADJUSTMENT",
      quantity: quantity - inventory.quantity,
      reason,
      balance: updated.quantity,
    },
  });

  await audit(admin.admin.id, "inventory.adjust", "inventory", inventoryId, {
    before: { quantity: inventory.quantity, lowStockThreshold: inventory.lowStockThreshold },
    after: { quantity: updated.quantity, lowStockThreshold: updated.lowStockThreshold },
  });
  revalidatePath("/admin/estoque");
  revalidatePath("/admin/produtos");
  revalidatePath("/catalogo");
}

export async function upsertCoupon(formData: FormData) {
  const admin = await withAdmin("coupons");
  const parsed = couponAdminSchema.safeParse({
    id: emptyToUndefined(formData.get("id")),
    code: formData.get("code"),
    description: formData.get("description"),
    type: formData.get("type"),
    value: formData.get("value"),
    minSubtotal: emptyToUndefined(formData.get("minSubtotal")),
    maxDiscount: emptyToUndefined(formData.get("maxDiscount")),
    startsAt: emptyToUndefined(formData.get("startsAt")),
    endsAt: emptyToUndefined(formData.get("endsAt")),
    usageLimit: emptyToUndefined(formData.get("usageLimit")),
    productIds: formData.get("productIds"),
    categoryIds: formData.get("categoryIds"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Cupom inválido.");

  const data = parsed.data;
  const before = data.id ? await prisma.coupon.findUnique({ where: { id: data.id } }) : null;

  try {
    const coupon = data.id
      ? await prisma.coupon.update({
          where: { id: data.id },
          data: {
            code: sanitizeText(data.code),
            description: sanitizeOptionalText(data.description),
            type: data.type,
            value: data.value,
            minSubtotal: data.minSubtotal,
            maxDiscount: data.maxDiscount,
            startsAt: optionalDate(data.startsAt),
            endsAt: optionalDate(data.endsAt),
            usageLimit: data.usageLimit,
            productIds: parseIdList(formData, "productIds"),
            categoryIds: parseIdList(formData, "categoryIds"),
            active: Boolean(data.active),
          },
        })
      : await prisma.coupon.create({
          data: {
            code: sanitizeText(data.code),
            description: sanitizeOptionalText(data.description),
            type: data.type,
            value: data.value,
            minSubtotal: data.minSubtotal,
            maxDiscount: data.maxDiscount,
            startsAt: optionalDate(data.startsAt),
            endsAt: optionalDate(data.endsAt),
            usageLimit: data.usageLimit,
            productIds: parseIdList(formData, "productIds"),
            categoryIds: parseIdList(formData, "categoryIds"),
            active: Boolean(data.active),
          },
        });

    await audit(admin.admin.id, data.id ? "coupon.update" : "coupon.create", "coupons", coupon.id, {
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: { id: coupon.id, code: coupon.code, active: coupon.active },
    });
    revalidatePath("/admin/cupons");
    revalidatePath("/carrinho");
    revalidatePath("/checkout");
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      throw new Error(duplicateMessage("Cupom"));
    }
    throw error;
  }
}

export const createCoupon = upsertCoupon;

export async function deactivateCoupon(formData: FormData) {
  const admin = await withAdmin("coupons");
  const id = String(formData.get("id") ?? "");

  await prisma.coupon.update({ where: { id }, data: { active: false } });
  await audit(admin.admin.id, "coupon.deactivate", "coupons", id, { after: { active: false } });
  revalidatePath("/admin/cupons");
  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}

export async function upsertBanner(formData: FormData) {
  const admin = await withAdmin("content");
  const parsed = bannerAdminSchema.safeParse({
    id: emptyToUndefined(formData.get("id")),
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    imageUrl: formData.get("imageUrl"),
    ctaLabel: formData.get("ctaLabel"),
    ctaHref: formData.get("ctaHref"),
    location: formData.get("location"),
    sortOrder: emptyToUndefined(formData.get("sortOrder")),
    startsAt: emptyToUndefined(formData.get("startsAt")),
    endsAt: emptyToUndefined(formData.get("endsAt")),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Banner invalido.");

  const data = parsed.data;
  const before = data.id ? await prisma.banner.findUnique({ where: { id: data.id } }) : null;
  const banner = data.id
    ? await prisma.banner.update({
        where: { id: data.id },
        data: {
          title: sanitizeText(data.title),
          subtitle: sanitizeOptionalText(data.subtitle),
          imageUrl: data.imageUrl,
          ctaLabel: sanitizeOptionalText(data.ctaLabel),
          ctaHref: sanitizeOptionalText(data.ctaHref),
          location: data.location,
          sortOrder: data.sortOrder ?? 0,
          startsAt: optionalDate(data.startsAt),
          endsAt: optionalDate(data.endsAt),
          active: Boolean(data.active),
        },
      })
    : await prisma.banner.create({
        data: {
          title: sanitizeText(data.title),
          subtitle: sanitizeOptionalText(data.subtitle),
          imageUrl: data.imageUrl,
          ctaLabel: sanitizeOptionalText(data.ctaLabel),
          ctaHref: sanitizeOptionalText(data.ctaHref),
          location: data.location,
          sortOrder: data.sortOrder ?? 0,
          startsAt: optionalDate(data.startsAt),
          endsAt: optionalDate(data.endsAt),
          active: Boolean(data.active),
        },
      });

  await audit(admin.admin.id, data.id ? "banner.update" : "banner.create", "banners", banner.id, {
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: { id: banner.id, title: banner.title, active: banner.active },
  });
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export const createBanner = upsertBanner;

export async function deactivateBanner(formData: FormData) {
  const admin = await withAdmin("content");
  const id = String(formData.get("id") ?? "");

  await prisma.banner.update({ where: { id }, data: { active: false } });
  await audit(admin.admin.id, "banner.deactivate", "banners", id, { after: { active: false } });
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function updateOrderStatus(formData: FormData) {
  const admin = await withAdmin("orders");
  const parsed = orderAdminSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });

  if (!parsed.success || !orderStatuses.includes(parsed.data.status)) {
    throw new Error("Status invalido.");
  }

  const before = await prisma.order.findUnique({
    where: { id: parsed.data.id },
    include: { payments: true },
  });

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        notes: sanitizeOptionalText(parsed.data.notes),
        canceledAt: parsed.data.status === "CANCELED" ? new Date() : undefined,
        paidAt: ["PAID", "PREPARING", "AWAITING_PICKUP", "SHIPPED", "DELIVERED"].includes(parsed.data.status)
          ? (before?.paidAt ?? new Date())
          : undefined,
      },
    });

    if (["PAID", "PREPARING", "AWAITING_PICKUP", "SHIPPED", "DELIVERED"].includes(parsed.data.status)) {
      await decrementInventoryForOrder(tx, order.id);
    }
  });

  await audit(admin.admin.id, "order.status", "orders", parsed.data.id, {
    before: before ? { status: before.status, notes: before.notes } : null,
    after: { status: parsed.data.status, notes: parsed.data.notes },
  });
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${parsed.data.id}`);
}

export async function upsertShippingMethod(formData: FormData) {
  const admin = await withAdmin("shipping");
  const parsed = shippingMethodAdminSchema.safeParse({
    id: emptyToUndefined(formData.get("id")),
    name: formData.get("name"),
    code: formData.get("code"),
    provider: formData.get("provider"),
    active: formData.get("active") === "on",
    basePrice: formData.get("basePrice") || 0,
    freeAbove: emptyToUndefined(formData.get("freeAbove")),
    deliveryDaysMin: formData.get("deliveryDaysMin") || 0,
    deliveryDaysMax: formData.get("deliveryDaysMax") || 1,
    settings: formData.get("settings"),
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Frete invalido.");

  const data = parsed.data;
  const settings = data.settings?.trim() ? (JSON.parse(data.settings) as Prisma.InputJsonValue) : undefined;
  const before = data.id ? await prisma.shippingMethod.findUnique({ where: { id: data.id } }) : null;
  const method = data.id
    ? await prisma.shippingMethod.update({
        where: { id: data.id },
        data: {
          name: sanitizeText(data.name),
          code: slug(data.code),
          provider: data.provider,
          active: Boolean(data.active),
          basePrice: data.basePrice,
          freeAbove: data.freeAbove,
          deliveryDaysMin: data.deliveryDaysMin,
          deliveryDaysMax: data.deliveryDaysMax,
          settings,
        },
      })
    : await prisma.shippingMethod.create({
        data: {
          name: sanitizeText(data.name),
          code: slug(data.code),
          provider: data.provider,
          active: Boolean(data.active),
          basePrice: data.basePrice,
          freeAbove: data.freeAbove,
          deliveryDaysMin: data.deliveryDaysMin,
          deliveryDaysMax: data.deliveryDaysMax,
          settings,
        },
      });

  await audit(admin.admin.id, data.id ? "shipping.update" : "shipping.create", "shipping_methods", method.id, {
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: { id: method.id, active: method.active },
  });
  revalidatePath("/admin/entregas");
  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}

export async function deactivateShippingMethod(formData: FormData) {
  const admin = await withAdmin("shipping");
  const id = String(formData.get("id") ?? "");
  await prisma.shippingMethod.update({ where: { id }, data: { active: false } });
  await audit(admin.admin.id, "shipping.deactivate", "shipping_methods", id, { after: { active: false } });
  revalidatePath("/admin/entregas");
}

export async function upsertPickupLocation(formData: FormData) {
  const admin = await withAdmin("shipping");
  const parsed = pickupLocationAdminSchema.safeParse({
    id: emptyToUndefined(formData.get("id")),
    name: formData.get("name"),
    zipCode: formData.get("zipCode"),
    street: formData.get("street"),
    number: formData.get("number"),
    complement: formData.get("complement"),
    district: formData.get("district"),
    city: formData.get("city"),
    state: formData.get("state"),
    instructions: formData.get("instructions"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Retirada invalida.");

  const data = parsed.data;
  const before = data.id ? await prisma.pickupLocation.findUnique({ where: { id: data.id } }) : null;
  const location = data.id
    ? await prisma.pickupLocation.update({
        where: { id: data.id },
        data: {
          name: sanitizeText(data.name),
          zipCode: sanitizeText(data.zipCode),
          street: sanitizeText(data.street),
          number: sanitizeText(data.number),
          complement: sanitizeOptionalText(data.complement),
          district: sanitizeText(data.district),
          city: sanitizeText(data.city),
          state: sanitizeText(data.state).toUpperCase(),
          instructions: sanitizeText(data.instructions),
          active: Boolean(data.active),
        },
      })
    : await prisma.pickupLocation.create({
        data: {
          name: sanitizeText(data.name),
          zipCode: sanitizeText(data.zipCode),
          street: sanitizeText(data.street),
          number: sanitizeText(data.number),
          complement: sanitizeOptionalText(data.complement),
          district: sanitizeText(data.district),
          city: sanitizeText(data.city),
          state: sanitizeText(data.state).toUpperCase(),
          instructions: sanitizeText(data.instructions),
          active: Boolean(data.active),
        },
      });

  await audit(admin.admin.id, data.id ? "pickup.update" : "pickup.create", "pickup_locations", location.id, {
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: { id: location.id, active: location.active },
  });
  revalidatePath("/admin/entregas");
  revalidatePath("/carrinho");
  revalidatePath("/checkout");
  revalidatePath("/retirada-na-loja");
}

export async function updateStoreSettings(formData: FormData) {
  const admin = await withAdmin("settings");
  const parsed = storeSettingsAdminSchema.safeParse({
    storeName: formData.get("storeName"),
    legalName: formData.get("legalName"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    businessHours: formData.get("businessHours"),
    instagram: formData.get("instagram"),
    paymentInfo: formData.get("paymentInfo"),
    deliveryInfo: formData.get("deliveryInfo"),
    pickupMessage: formData.get("pickupMessage"),
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Configuracao invalida.");

  const data = parsed.data;
  const before = await prisma.storeSetting.findMany({
    where: { key: { in: ["store", "checkout", "delivery", "payments"] } },
  });

  await prisma.$transaction([
    prisma.storeSetting.upsert({
      where: { key: "store" },
      create: {
        key: "store",
        description: "Dados publicos da loja",
        value: {
          name: data.storeName,
          legalName: data.legalName,
          phone: data.phone,
          whatsapp: data.whatsapp,
          email: data.email,
          address: data.address,
          city: data.city,
          state: data.state,
          businessHours: data.businessHours,
          instagram: data.instagram,
        },
      },
      update: {
        value: {
          name: data.storeName,
          legalName: data.legalName,
          phone: data.phone,
          whatsapp: data.whatsapp,
          email: data.email,
          address: data.address,
          city: data.city,
          state: data.state,
          businessHours: data.businessHours,
          instagram: data.instagram,
        },
      },
    }),
    prisma.storeSetting.upsert({
      where: { key: "checkout" },
      create: {
        key: "checkout",
        description: "Configurações de checkout",
        value: { defaultPickupMessage: data.pickupMessage },
      },
      update: { value: { defaultPickupMessage: data.pickupMessage } },
    }),
    prisma.storeSetting.upsert({
      where: { key: "delivery" },
      create: {
        key: "delivery",
        description: "Configurações de entrega",
        value: { deliveryInfo: data.deliveryInfo },
      },
      update: { value: { deliveryInfo: data.deliveryInfo } },
    }),
    prisma.storeSetting.upsert({
      where: { key: "payments" },
      create: {
        key: "payments",
        description: "Informacoes de pagamento",
        value: { instructions: data.paymentInfo },
      },
      update: { value: { instructions: data.paymentInfo } },
    }),
  ]);

  await audit(admin.admin.id, "settings.update", "store_settings", "store", {
    before: JSON.parse(JSON.stringify(before)),
    after: data,
  });
  revalidatePath("/admin/configuracoes");
  revalidatePath("/");
  revalidatePath("/contato");
  revalidatePath("/retirada-na-loja");
}

export async function updateFinancialSettings(formData: FormData) {
  const admin = await withAdmin("finance");
  const parsed = financialSettingsAdminSchema.safeParse({
    mercadoPagoRate: formData.get("mercadoPagoRate") || 0,
    fixedTransactionFee: formData.get("fixedTransactionFee") || 0,
    posCashRate: formData.get("posCashRate") || 0,
    posPixRate: formData.get("posPixRate") || 0,
    posDebitRate: formData.get("posDebitRate") || 0,
    posCreditRate: formData.get("posCreditRate") || 0,
    posMercadoPagoRate: formData.get("posMercadoPagoRate") || 0,
    allowNegativeStock: formData.get("allowNegativeStock") === "on",
    estimatedTaxRate: formData.get("estimatedTaxRate") || 0,
    defaultPackagingCost: formData.get("defaultPackagingCost") || 0,
    minimumMargin: formData.get("minimumMargin") || 0,
    lowMarginAlert: formData.get("lowMarginAlert") || 0,
    defaultShippingCostPaidByStore: formData.get("defaultShippingCostPaidByStore") || 0,
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Configuracao financeira invalida.");

  const before = await prisma.financialSettings.findFirst({ orderBy: { createdAt: "asc" } });
  const settings = await prisma.financialSettings.upsert({
    where: { name: "default" },
    create: {
      name: "default",
      ...parsed.data,
    },
    update: parsed.data,
  });

  await audit(admin.admin.id, "finance.settings.update", "financial_settings", settings.id, {
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: parsed.data,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/produtos");
}

export async function updateHomeContent(formData: FormData) {
  const admin = await withAdmin("content");
  const parsed = homeContentAdminSchema.safeParse({
    heroTitle: formData.get("heroTitle"),
    heroSubtitle: formData.get("heroSubtitle"),
    heroPrimaryLabel: formData.get("heroPrimaryLabel"),
    heroPrimaryHref: formData.get("heroPrimaryHref"),
    heroSecondaryLabel: formData.get("heroSecondaryLabel"),
    heroSecondaryHref: formData.get("heroSecondaryHref"),
    institutionalText: formData.get("institutionalText"),
    footerText: formData.get("footerText"),
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Conteudo invalido.");

  const before = await prisma.storeSetting.findUnique({ where: { key: "home" } });
  const setting = await prisma.storeSetting.upsert({
    where: { key: "home" },
    create: {
      key: "home",
      description: "Conteudo editavel da home",
      value: parsed.data,
    },
    update: { value: parsed.data },
  });

  await audit(admin.admin.id, "home.update", "store_settings", setting.id, {
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: parsed.data,
  });
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export type AdminActionName =
  | "upsertProduct"
  | "archiveProduct"
  | "upsertProductVariant"
  | "deactivateProductVariant"
  | "upsertCategory"
  | "deactivateCategory"
  | "adjustInventory"
  | "upsertCoupon"
  | "deactivateCoupon"
  | "upsertBanner"
  | "deactivateBanner"
  | "updateOrderStatus"
  | "upsertShippingMethod"
  | "deactivateShippingMethod"
  | "upsertPickupLocation"
  | "updateStoreSettings"
  | "updateFinancialSettings"
  | "updateHomeContent";

export type AdminActionState = {
  ok: boolean;
  message: string;
};

const adminActionHandlers: Record<AdminActionName, (formData: FormData) => Promise<unknown>> = {
  upsertProduct,
  archiveProduct,
  upsertProductVariant,
  deactivateProductVariant,
  upsertCategory,
  deactivateCategory,
  adjustInventory,
  upsertCoupon,
  deactivateCoupon,
  upsertBanner,
  deactivateBanner,
  updateOrderStatus,
  upsertShippingMethod,
  deactivateShippingMethod,
  upsertPickupLocation,
  updateStoreSettings,
  updateFinancialSettings,
  updateHomeContent,
};

const adminSuccessMessages: Record<AdminActionName, string> = {
  upsertProduct: "Produto salvo com sucesso.",
  archiveProduct: "Produto arquivado com sucesso.",
  upsertProductVariant: "Variação salva com sucesso.",
  deactivateProductVariant: "Variação desativada com sucesso.",
  upsertCategory: "Categoria salva com sucesso.",
  deactivateCategory: "Categoria desativada com sucesso.",
  adjustInventory: "Estoque ajustado com sucesso.",
  upsertCoupon: "Cupom salvo com sucesso.",
  deactivateCoupon: "Cupom desativado com sucesso.",
  upsertBanner: "Banner salvo com sucesso.",
  deactivateBanner: "Banner desativado com sucesso.",
  updateOrderStatus: "Status do pedido atualizado.",
  upsertShippingMethod: "Método de entrega salvo com sucesso.",
  deactivateShippingMethod: "Método de entrega desativado.",
  upsertPickupLocation: "Ponto de retirada salvo com sucesso.",
  updateStoreSettings: "Configurações da loja salvas.",
  updateFinancialSettings: "Configurações financeiras salvas.",
  updateHomeContent: "Conteúdo da home atualizado.",
};

function adminErrorMessage(error: unknown) {
  if (isDatabaseUnavailable(error)) {
    return "Banco de dados indisponível. Confira o PostgreSQL e tente novamente.";
  }

  if (error instanceof SyntaxError) {
    return "Há um campo com formato inválido. Revise atributos e dados estruturados.";
  }

  if (error instanceof Error && error.name === "Error" && error.message.length <= 220) {
    return error.message;
  }

  return "Não foi possível concluir esta alteração. Revise os dados e tente novamente.";
}

export async function runAdminAction(
  actionName: AdminActionName,
  _: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    await adminActionHandlers[actionName](formData);
    return { ok: true, message: adminSuccessMessages[actionName] };
  } catch (error) {
    return { ok: false, message: adminErrorMessage(error) };
  }
}
