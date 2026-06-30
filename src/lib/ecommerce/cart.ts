import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { calculateDiscount } from "@/lib/ecommerce/coupons";
import { getDemoCartForDisplay } from "@/lib/ecommerce/demo-cart";
import { isDemoModeAllowed } from "@/lib/db/errors";
import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";

export const CART_COOKIE = "xnutri_cart_id";

export async function getCartCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE)?.value;
}

export async function getCartForDisplay() {
  try {
    const user = await getCurrentUser();
    const sessionId = await getCartCookie();

    const cart = await prisma.cart.findFirst({
      where: user?.id ? { userId: user.id } : sessionId ? { sessionId } : { id: "__empty__" },
      include: {
        coupon: true,
        shippingMethod: true,
        pickupLocation: true,
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: "asc" }, take: 1 },
              },
            },
            variant: {
              include: { inventory: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const items =
      cart?.items.map((item) => {
        const unitPrice = toNumber(item.product.price) + toNumber(item.variant?.priceAdjustment ?? 0);
        const quantity = item.quantity;
        return {
          id: item.id,
          productId: item.productId,
          categoryId: item.product.categoryId,
          variantId: item.variantId,
          name: item.product.name,
          slug: item.product.slug,
          sku: item.variant?.sku ?? item.product.sku,
          imageUrl: item.product.images[0]?.url,
          variantName: item.variant?.name,
          quantity,
          unitPrice,
          total: unitPrice * quantity,
          availableStock: item.variant?.inventory
            ? Math.max(item.variant.inventory.quantity - item.variant.inventory.reserved, 0)
            : 0,
        };
      }) ?? [];

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const shippingCost = cart ? toNumber(cart.shippingCost) : 0;
    const discount = calculateDiscount(cart?.coupon ?? null, subtotal, shippingCost, items);
    const total = Math.max(subtotal + shippingCost - discount, 0);

    return {
      id: cart?.id,
      items,
      coupon: cart?.coupon ?? null,
      shippingMethod: cart?.shippingMethod ?? null,
      pickupLocation: cart?.pickupLocation ?? null,
      shippingZipCode: cart?.shippingZipCode ?? null,
      subtotal,
      shippingCost,
      discount,
      total,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  } catch (error) {
    if (isDemoModeAllowed()) return getDemoCartForDisplay();
    throw error;
  }
}

export async function getMutableCart() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(CART_COOKIE)?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookieStore.set(CART_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  let cart = await prisma.cart.findFirst({
    where: user?.id ? { userId: user.id } : { sessionId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId: user?.id,
        sessionId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });
  } else if (user?.id && !cart.userId) {
    cart = await prisma.cart.update({
      where: { id: cart.id },
      data: { userId: user.id },
    });
  }

  return cart;
}

export async function assertCartOwnership(cartId: string) {
  const user = await getCurrentUser();
  const sessionId = await getCartCookie();

  const cart = await prisma.cart.findFirst({
    where: {
      id: cartId,
      OR: [
        ...(user?.id ? [{ userId: user.id }] : []),
        ...(sessionId ? [{ sessionId }] : []),
      ],
    },
  });

  if (!cart) {
    throw new Error("Carrinho não encontrado.");
  }

  return cart;
}
