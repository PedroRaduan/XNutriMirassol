"use server";

import type { OrderStatus } from "@prisma/client";
import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { decrementInventoryForOrder } from "@/lib/ecommerce/inventory";
import { assertSameOrigin } from "@/lib/security/request";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import { bannerAdminSchema, categoryAdminSchema, couponAdminSchema, productAdminSchema } from "@/lib/validations";

const orderStatuses: OrderStatus[] = ["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELED"];

function slug(value: string) {
  return slugify(value, { lower: true, strict: true, locale: "pt" });
}

async function audit(action: string, entity: string, entityId?: string, metadata?: unknown) {
  const user = await requireAdmin();
  const admin = await prisma.adminUser.findUnique({ where: { userId: user.id } });

  await prisma.auditLog.create({
    data: {
      adminUserId: admin?.id,
      action,
      entity,
      entityId,
      metadata: metadata ?? undefined,
    },
  });
}

export async function upsertProduct(formData: FormData) {
  await assertSameOrigin();
  await requireAdmin();

  const parsed = productAdminSchema.safeParse({
    id: formData.get("id") || undefined,
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    sku: formData.get("sku"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || undefined,
    imageUrl: formData.get("imageUrl"),
    featured: formData.get("featured") === "on",
    bestSeller: formData.get("bestSeller") === "on",
    promotion: formData.get("promotion") === "on",
    stock: formData.get("stock"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Produto invalido.");
  }

  const data = parsed.data;

  const product = data.id
    ? await prisma.product.update({
        where: { id: data.id },
        data: {
          categoryId: data.categoryId,
          name: sanitizeText(data.name),
          slug: slug(data.name),
          sku: sanitizeText(data.sku),
          shortDescription: sanitizeText(data.shortDescription),
          description: sanitizeText(data.description),
          price: data.price,
          compareAtPrice: data.compareAtPrice,
          featured: Boolean(data.featured),
          bestSeller: Boolean(data.bestSeller),
          promotion: Boolean(data.promotion),
          images: {
            deleteMany: {},
            create: { url: data.imageUrl, alt: data.name, sortOrder: 1 },
          },
        },
      })
    : await prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            categoryId: data.categoryId,
            name: sanitizeText(data.name),
            slug: slug(data.name),
            sku: sanitizeText(data.sku),
            shortDescription: sanitizeText(data.shortDescription),
            description: sanitizeText(data.description),
            price: data.price,
            compareAtPrice: data.compareAtPrice,
            featured: Boolean(data.featured),
            bestSeller: Boolean(data.bestSeller),
            promotion: Boolean(data.promotion),
            images: {
              create: { url: data.imageUrl, alt: data.name, sortOrder: 1 },
            },
          },
        });

        const variant = await tx.productVariant.create({
          data: {
            productId: created.id,
            name: "Padrao",
            sku: `${data.sku}-PADRAO`,
            attributes: { tipo: "Padrao" },
          },
        });

        await tx.inventory.create({
          data: {
            productId: created.id,
            variantId: variant.id,
            quantity: data.stock,
            available: data.stock > 0,
          },
        });

        return created;
      });

  await audit(data.id ? "product.update" : "product.create", "products", product.id);
  revalidatePath("/admin/produtos");
  revalidatePath("/catalogo");
}

export async function deleteProduct(formData: FormData) {
  await assertSameOrigin();
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  await prisma.product.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  await audit("product.archive", "products", id);
  revalidatePath("/admin/produtos");
  revalidatePath("/catalogo");
}

export async function createCategory(formData: FormData) {
  await assertSameOrigin();
  await requireAdmin();
  const parsed = categoryAdminSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
  });

  if (!parsed.success) throw new Error("Categoria invalida.");

  const category = await prisma.category.create({
    data: {
      name: sanitizeText(parsed.data.name),
      slug: slug(parsed.data.name),
      description: sanitizeOptionalText(parsed.data.description),
      imageUrl: sanitizeOptionalText(parsed.data.imageUrl),
    },
  });

  await audit("category.create", "categories", category.id);
  revalidatePath("/admin/categorias");
  revalidatePath("/catalogo");
}

export async function adjustInventory(formData: FormData) {
  await assertSameOrigin();
  const user = await requireAdmin();
  const inventoryId = String(formData.get("inventoryId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const reason = sanitizeText(String(formData.get("reason") ?? "Ajuste manual"));

  const inventory = await prisma.inventory.findUniqueOrThrow({
    where: { id: inventoryId },
  });

  const updated = await prisma.inventory.update({
    where: { id: inventoryId },
    data: {
      quantity,
      available: quantity > 0,
    },
  });

  await prisma.inventoryMovement.create({
    data: {
      inventoryId,
      createdById: user.id,
      type: "ADJUSTMENT",
      quantity: quantity - inventory.quantity,
      reason,
      balance: updated.quantity,
    },
  });

  await audit("inventory.adjust", "inventory", inventoryId, { previous: inventory.quantity, next: quantity });
  revalidatePath("/admin/estoque");
}

export async function createCoupon(formData: FormData) {
  await assertSameOrigin();
  await requireAdmin();
  const parsed = couponAdminSchema.safeParse({
    code: formData.get("code"),
    description: formData.get("description"),
    type: formData.get("type"),
    value: formData.get("value"),
    minSubtotal: formData.get("minSubtotal") || undefined,
    usageLimit: formData.get("usageLimit") || undefined,
    active: formData.get("active") === "on",
  });

  if (!parsed.success) throw new Error("Cupom invalido.");

  const coupon = await prisma.coupon.create({
    data: {
      code: sanitizeText(parsed.data.code),
      description: sanitizeOptionalText(parsed.data.description),
      type: parsed.data.type,
      value: parsed.data.value,
      minSubtotal: parsed.data.minSubtotal,
      usageLimit: parsed.data.usageLimit,
      active: Boolean(parsed.data.active),
    },
  });

  await audit("coupon.create", "coupons", coupon.id);
  revalidatePath("/admin/cupons");
}

export async function createBanner(formData: FormData) {
  await assertSameOrigin();
  await requireAdmin();
  const parsed = bannerAdminSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    imageUrl: formData.get("imageUrl"),
    ctaLabel: formData.get("ctaLabel"),
    ctaHref: formData.get("ctaHref"),
    location: formData.get("location"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) throw new Error("Banner invalido.");

  const banner = await prisma.banner.create({
    data: {
      title: sanitizeText(parsed.data.title),
      subtitle: sanitizeOptionalText(parsed.data.subtitle),
      imageUrl: parsed.data.imageUrl,
      ctaLabel: sanitizeOptionalText(parsed.data.ctaLabel),
      ctaHref: sanitizeOptionalText(parsed.data.ctaHref),
      location: parsed.data.location,
      active: Boolean(parsed.data.active),
    },
  });

  await audit("banner.create", "banners", banner.id);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function updateOrderStatus(formData: FormData) {
  await assertSameOrigin();
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;

  if (!orderStatuses.includes(status)) {
    throw new Error("Status invalido.");
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id },
      data: {
        status,
        canceledAt: status === "CANCELED" ? new Date() : undefined,
        paidAt: status === "PAID" ? new Date() : undefined,
      },
    });

    if (status === "PAID") {
      await decrementInventoryForOrder(tx, order.id);
    }
  });

  await audit("order.status", "orders", id, { status });
  revalidatePath("/admin/pedidos");
}
