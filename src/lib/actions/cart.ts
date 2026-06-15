"use server";

import { revalidatePath } from "next/cache";
import { assertSameOrigin } from "@/lib/security/request";
import { getMutableCart, getCartForDisplay, assertCartOwnership } from "@/lib/ecommerce/cart";
import { prisma } from "@/lib/db/prisma";
import { cartItemSchema, couponSchema } from "@/lib/validations";
import { quoteShipping } from "@/lib/shipping/quote";

export async function addToCart(formData: FormData) {
  await assertSameOrigin();
  const parsed = cartItemSchema.safeParse({
    productId: formData.get("productId"),
    variantId: formData.get("variantId") || undefined,
    quantity: formData.get("quantity") ?? 1,
  });

  if (!parsed.success) {
    throw new Error("Produto inválido.");
  }

  const variant = parsed.data.variantId
    ? await prisma.productVariant.findFirst({
        where: {
          id: parsed.data.variantId,
          productId: parsed.data.productId,
          active: true,
        },
        include: { inventory: true },
      })
    : null;

  if (parsed.data.variantId && !variant) {
    throw new Error("Variação indisponível.");
  }

  if (variant?.inventory && variant.inventory.quantity - variant.inventory.reserved < parsed.data.quantity) {
    throw new Error("Estoque insuficiente para esta variação.");
  }

  const cart = await getMutableCart();

  const existing = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: parsed.data.productId,
      variantId: parsed.data.variantId ?? null,
    },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + parsed.data.quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: parsed.data.productId,
        variantId: parsed.data.variantId,
        quantity: parsed.data.quantity,
      },
    });
  }

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}

export async function updateCartItem(formData: FormData) {
  await assertSameOrigin();
  const cartId = String(formData.get("cartId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);

  await assertCartOwnership(cartId);

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: Math.min(quantity, 99) },
    });
  }

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}

export async function removeCartItem(formData: FormData) {
  await assertSameOrigin();
  const cartId = String(formData.get("cartId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  await assertCartOwnership(cartId);
  await prisma.cartItem.delete({ where: { id: itemId } });

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}

export async function applyCoupon(formData: FormData) {
  await assertSameOrigin();
  const cart = await getMutableCart();
  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
  });

  if (!parsed.success) {
    throw new Error("Cupom inválido.");
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: parsed.data.code },
  });

  if (!coupon) {
    throw new Error("Cupom não encontrado.");
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponId: coupon.id },
  });

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}

export async function clearCoupon() {
  await assertSameOrigin();
  const cart = await getMutableCart();
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponId: null },
  });

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}

export async function selectShipping(formData: FormData) {
  await assertSameOrigin();
  const cart = await getMutableCart();
  const zipCode = String(formData.get("zipCode") ?? "");
  const methodId = String(formData.get("methodId") ?? "");
  const current = await getCartForDisplay();
  const quotes = await quoteShipping(zipCode, current.subtotal);
  const selected = quotes.find((quote) => quote.methodId === methodId);

  if (!selected) {
    throw new Error("Frete inválido.");
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      shippingZipCode: zipCode,
      shippingMethodId: methodId,
      pickupLocationId: null,
      shippingCost: selected.price,
    },
  });

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}

export async function selectPickup(formData: FormData) {
  await assertSameOrigin();
  const cart = await getMutableCart();
  const pickupLocationId = String(formData.get("pickupLocationId") ?? "");

  await prisma.pickupLocation.findFirstOrThrow({
    where: { id: pickupLocationId, active: true },
  });

  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      shippingMethodId: null,
      pickupLocationId,
      shippingCost: 0,
    },
  });

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}
