import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { CART_COOKIE, getCartForDisplay } from "@/lib/ecommerce/cart";
import { calculateDiscount } from "@/lib/ecommerce/coupons";
import { prisma } from "@/lib/db/prisma";
import { checkoutSchema } from "@/lib/validations";
import { generateOrderNumber, toNumber } from "@/lib/utils";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import { createMercadoPagoPreference } from "@/lib/payments/mercado-pago";

export async function createOrderFromCheckout(formData: FormData) {
  const user = await getCurrentUser();
  const cart = await getCartForDisplay();

  if (!cart.id || cart.items.length === 0) {
    throw new Error("Carrinho vazio.");
  }

  const parsed = checkoutSchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    document: formData.get("document"),
    shippingType: formData.get("shippingType"),
    paymentMethod: formData.get("paymentMethod"),
    zipCode: formData.get("zipCode"),
    street: formData.get("street"),
    number: formData.get("number"),
    complement: formData.get("complement"),
    district: formData.get("district"),
    city: formData.get("city"),
    state: formData.get("state"),
    shippingMethodId: formData.get("shippingMethodId"),
    pickupLocationId: formData.get("pickupLocationId"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados de checkout invalidos.");
  }

  const data = parsed.data;
  const orderNumber = generateOrderNumber();
  const pickupProtocol =
    data.shippingType === "PICKUP" ? `XN-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : null;

  const createdOrder = await prisma.$transaction(async (tx) => {
    const dbCart = await tx.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: {
        coupon: true,
        items: {
          include: {
            product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
            variant: { include: { inventory: true } },
          },
        },
      },
    });

    if (dbCart.items.length === 0) {
      throw new Error("Carrinho vazio.");
    }

    for (const item of dbCart.items) {
      const available = item.variant?.inventory
        ? item.variant.inventory.quantity - item.variant.inventory.reserved
        : 0;

      if (available < item.quantity) {
        throw new Error(`Estoque insuficiente para ${item.product.name}.`);
      }
    }

    const subtotal = dbCart.items.reduce((sum, item) => {
      return sum + (toNumber(item.product.price) + toNumber(item.variant?.priceAdjustment ?? 0)) * item.quantity;
    }, 0);
    const shippingCost = data.shippingType === "PICKUP" ? 0 : cart.shippingCost;
    const discount = calculateDiscount(
      dbCart.coupon,
      subtotal,
      shippingCost,
      dbCart.items.map((item) => ({
        productId: item.productId,
        categoryId: item.product.categoryId,
        total: (toNumber(item.product.price) + toNumber(item.variant?.priceAdjustment ?? 0)) * item.quantity,
      })),
    );
    const total = Math.max(subtotal + shippingCost - discount, 0);

    let addressId: string | undefined;

    if (data.shippingType === "DELIVERY" && user?.id) {
      const address = await tx.address.create({
        data: {
          userId: user.id,
          label: "Checkout",
          recipient: sanitizeText(data.customerName),
          zipCode: sanitizeText(data.zipCode ?? ""),
          street: sanitizeText(data.street ?? ""),
          number: sanitizeText(data.number ?? ""),
          complement: sanitizeOptionalText(data.complement),
          district: sanitizeText(data.district ?? ""),
          city: sanitizeText(data.city ?? ""),
          state: sanitizeText(data.state ?? "").toUpperCase(),
        },
      });
      addressId = address.id;
    }

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: user?.id,
        couponId: dbCart.couponId,
        customerName: sanitizeText(data.customerName),
        customerEmail: data.customerEmail,
        customerPhone: sanitizeText(data.customerPhone),
        document: sanitizeOptionalText(data.document),
        shippingType: data.shippingType,
        shippingMethodId: data.shippingType === "DELIVERY" ? data.shippingMethodId : undefined,
        pickupLocationId: data.shippingType === "PICKUP" ? data.pickupLocationId : undefined,
        shippingAddressId: addressId,
        pickupProtocol,
        subtotal,
        discount,
        shippingCost,
        total,
        notes: sanitizeOptionalText(data.notes),
        shippingSnapshot:
          data.shippingType === "DELIVERY"
            ? {
                zipCode: data.zipCode,
                street: data.street,
                number: data.number,
                complement: data.complement,
                district: data.district,
                city: data.city,
                state: data.state,
              }
            : undefined,
      },
    });

    await tx.orderItem.createMany({
      data: dbCart.items.map((item) => {
        const unitPrice = toNumber(item.product.price) + toNumber(item.variant?.priceAdjustment ?? 0);

        return {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.product.name,
          sku: item.variant?.sku ?? item.product.sku,
          imageUrl: item.product.images[0]?.url,
          quantity: item.quantity,
          unitPrice,
          total: unitPrice * item.quantity,
          attributes: item.variant?.attributes ?? undefined,
        };
      }),
    });

    await tx.payment.create({
      data: {
        orderId: order.id,
        method: data.paymentMethod,
        status: "PENDING",
        amount: total,
      },
    });

    if (dbCart.couponId) {
      await tx.coupon.update({
        where: { id: dbCart.couponId },
        data: { usageCount: { increment: 1 } },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId: dbCart.id } });
    await tx.cart.delete({ where: { id: dbCart.id } });

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        items: true,
        payments: true,
      },
    });
  });

  try {
    const preference = await createMercadoPagoPreference(createdOrder);
    await prisma.payment.update({
      where: { id: createdOrder.payments[0].id },
      data: {
        preferenceId: preference.id,
        checkoutUrl: preference.init_point ?? preference.sandbox_init_point,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(CART_COOKIE);
  redirect(`/pedido/${createdOrder.orderNumber}`);
}
