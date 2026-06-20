"use server";

import { revalidatePath } from "next/cache";
import { assertSameOrigin } from "@/lib/security/request";
import { getMutableCart, getCartForDisplay, assertCartOwnership } from "@/lib/ecommerce/cart";
import { calculateDiscount, isCouponActive } from "@/lib/ecommerce/coupons";
import {
  addDemoCartItem,
  applyDemoCoupon,
  clearDemoCoupon,
  removeDemoCartItem,
  selectDemoPickup,
  selectDemoShipping,
  updateDemoCartItem,
} from "@/lib/ecommerce/demo-cart";
import { isDatabaseUnavailable } from "@/lib/db/errors";
import { prisma } from "@/lib/db/prisma";
import { cartItemSchema, couponSchema } from "@/lib/validations";
import { quoteShipping } from "@/lib/shipping/quote";
import { toNumber } from "@/lib/utils";

export type CouponActionState = {
  ok: boolean;
  message: string;
};

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

  if (parsed.data.productId.startsWith("fallback-")) {
    await addDemoCartItem(parsed.data.productId, parsed.data.variantId, parsed.data.quantity);
    revalidatePath("/carrinho");
    revalidatePath("/checkout");
    return;
  }

  let variant = null;

  try {
    variant = parsed.data.variantId
      ? await prisma.productVariant.findFirst({
          where: {
            id: parsed.data.variantId,
            productId: parsed.data.productId,
            active: true,
          },
          include: { inventory: true },
        })
      : null;
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      await addDemoCartItem(parsed.data.productId, parsed.data.variantId, parsed.data.quantity);
      revalidatePath("/carrinho");
      revalidatePath("/checkout");
      return;
    }
    throw error;
  }

  if (parsed.data.variantId && !variant) {
    throw new Error("Variação indisponível.");
  }

  if (variant?.inventory && variant.inventory.quantity - variant.inventory.reserved < parsed.data.quantity) {
    throw new Error("Estoque insuficiente para esta variação.");
  }

  let cart;
  try {
    cart = await getMutableCart();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      await addDemoCartItem(parsed.data.productId, parsed.data.variantId, parsed.data.quantity);
      revalidatePath("/carrinho");
      revalidatePath("/checkout");
      return;
    }
    throw error;
  }

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

  if (cartId === "demo-cart") {
    await updateDemoCartItem(itemId, quantity);
    revalidatePath("/carrinho");
    revalidatePath("/checkout");
    return;
  }

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

  if (cartId === "demo-cart") {
    await removeDemoCartItem(itemId);
    revalidatePath("/carrinho");
    revalidatePath("/checkout");
    return;
  }

  await assertCartOwnership(cartId);
  await prisma.cartItem.delete({ where: { id: itemId } });

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}

export async function applyCoupon(_: CouponActionState, formData: FormData): Promise<CouponActionState> {
  await assertSameOrigin();
  let cart;
  let current;
  try {
    cart = await getMutableCart();
    current = await getCartForDisplay();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      const result = await applyDemoCoupon(String(formData.get("code") ?? ""));
      revalidatePath("/carrinho");
      revalidatePath("/checkout");
      return result;
    }
    throw error;
  }
  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Informe um cupom valido." };
  }

  if (!current.id || current.items.length === 0) {
    return { ok: false, message: "Adicione produtos ao carrinho antes de usar cupom." };
  }

  let coupon;
  try {
    coupon = await prisma.coupon.findUnique({
      where: { code: parsed.data.code },
    });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      const result = await applyDemoCoupon(parsed.data.code);
      revalidatePath("/carrinho");
      revalidatePath("/checkout");
      return result;
    }
    throw error;
  }

  if (!coupon) {
    return { ok: false, message: "Cupom nao encontrado." };
  }

  if (!isCouponActive(coupon)) {
    return { ok: false, message: "Este cupom nao esta ativo ou ja expirou." };
  }

  if (coupon.minSubtotal && current.subtotal < toNumber(coupon.minSubtotal)) {
    return {
      ok: false,
      message: `Este cupom exige subtotal minimo de ${toNumber(coupon.minSubtotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    };
  }

  if (coupon.type === "FREE_SHIPPING" && current.shippingCost <= 0) {
    return { ok: false, message: "Escolha uma entrega paga antes de aplicar frete gratis." };
  }

  const discount = calculateDiscount(coupon, current.subtotal, current.shippingCost, current.items);
  if (discount <= 0) {
    return { ok: false, message: "Este cupom nao se aplica aos itens atuais do carrinho." };
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponId: coupon.id },
  });

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
  return { ok: true, message: "Cupom aplicado com sucesso." };
}

export async function clearCoupon() {
  await assertSameOrigin();
  let cart;
  try {
    cart = await getMutableCart();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      await clearDemoCoupon();
      revalidatePath("/carrinho");
      revalidatePath("/checkout");
      return;
    }
    throw error;
  }
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponId: null },
  });

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
}

export async function selectShipping(formData: FormData) {
  await assertSameOrigin();
  const zipCode = String(formData.get("zipCode") ?? "");
  const methodId = String(formData.get("methodId") ?? "");
  const current = await getCartForDisplay();
  const quotes = await quoteShipping(zipCode, current.subtotal);
  const selected = quotes.find((quote) => quote.methodId === methodId);

  if (!selected) {
    throw new Error("Frete inválido.");
  }

  let cart;
  try {
    cart = await getMutableCart();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      await selectDemoShipping(zipCode, methodId, selected.price);
      revalidatePath("/carrinho");
      revalidatePath("/checkout");
      return;
    }
    throw error;
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
  const pickupLocationId = String(formData.get("pickupLocationId") ?? "");

  let cart;
  try {
    cart = await getMutableCart();
    await prisma.pickupLocation.findFirstOrThrow({
      where: { id: pickupLocationId, active: true },
    });
  } catch (error) {
    if (isDatabaseUnavailable(error) || pickupLocationId.startsWith("fallback-")) {
      await selectDemoPickup(pickupLocationId);
      revalidatePath("/carrinho");
      revalidatePath("/checkout");
      return;
    }
    throw error;
  }

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
